
const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const summaryQueue = require("../jobs/summaryQueue");
const Knowledge = require("../models/Knowledge");

const {
  generateEmbedding,
} = require("../services/embeddingService");

const {
  generateKnowledgeAnswer,
} = require("../services/aiService");

// RAG configuration
const RAG_MIN_SIMILARITY = 0.60;
const RAG_MAX_SOURCES = 5;
const EMBEDDING_DIMENSIONS = 768;

const MAX_HISTORY_MESSAGES = 10;
const MAX_MESSAGE_LENGTH = 4000;

// Calculate cosine similarity
function cosineSimilarity(vectorA, vectorB) {
  if (
    !Array.isArray(vectorA) ||
    !Array.isArray(vectorB) ||
    vectorA.length !== vectorB.length ||
    vectorA.length === 0
  ) {
    return 0;
  }

  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let i = 0; i < vectorA.length; i++) {
    dotProduct += vectorA[i] * vectorB[i];
    magnitudeA += vectorA[i] ** 2;
    magnitudeB += vectorB[i] ** 2;
  }

  const denominator =
    Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB);

  if (denominator === 0) return 0;

  return dotProduct / denominator;
}

// Validate and sanitize conversation history
function validateConversationHistory(history) {
  if (history === undefined) {
    return [];
  }

  if (!Array.isArray(history)) {
    throw new Error("Conversation history must be an array");
  }

  return history
    .slice(-MAX_HISTORY_MESSAGES)
    .filter(
      (message) =>
        message &&
        ["user", "assistant"].includes(message.role) &&
        typeof message.content === "string" &&
        message.content.trim().length > 0
    )
    .map((message) => ({
      role: message.role,
      content: message.content
        .trim()
        .slice(0, MAX_MESSAGE_LENGTH),
    }));
}

// Submit knowledge for background summarization
router.post("/", authMiddleware, async (req, res) => {
  let knowledge;

  try {
    const { title, content } = req.body;

    if (
      !title ||
      typeof title !== "string" ||
      !title.trim() ||
      !content ||
      typeof content !== "string" ||
      !content.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Title and knowledge content are required",
      });
    }

    if (title.trim().length > 150) {
      return res.status(400).json({
        success: false,
        message: "Title cannot exceed 150 characters",
      });
    }

    knowledge = await Knowledge.create({
      title: title.trim(),
      content: content.trim(),
      owner: req.user._id,
      status: "pending",
    });

    try {
      const job = await summaryQueue.add(
        "generate-summary",
        {
          knowledgeId: knowledge._id.toString(),
          userId: req.user._id.toString(),
        },
        {
          attempts: 4,
          backoff: {
            type: "exponential",
            delay: 10000,
          },
          removeOnComplete: 100,
          removeOnFail: 100,
        }
      );

      return res.status(202).json({
        success: true,
        message: "Knowledge saved and summary job queued successfully",
        knowledgeId: knowledge._id,
        jobId: job.id,
        status: knowledge.status,
      });
    } catch (queueError) {
      knowledge.status = "failed";
      await knowledge.save();
      throw queueError;
    }
  } catch (error) {
    console.error("Summary submission error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to submit knowledge for summarization",
    });
  }
});

// RAG assistant with conversation memory
router.post("/ask", authMiddleware, async (req, res) => {
  try {
    const { question, conversationHistory } = req.body;

    if (
      !question ||
      typeof question !== "string" ||
      !question.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "A valid question is required",
      });
    }

    if (question.trim().length > 1000) {
      return res.status(400).json({
        success: false,
        message: "Question cannot exceed 1000 characters",
      });
    }

    // Validate conversation history
    let validatedHistory;

    try {
      validatedHistory =
        validateConversationHistory(conversationHistory);
    } catch (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError.message,
      });
    }

    console.log("\n========== RAG ASSISTANT ==========");
    console.log("Question:", question.trim());
    console.log(
      "Conversation history messages:",
      validatedHistory.length
    );

    // Generate question embedding
    console.log("Generating question embedding...");

    const queryEmbedding = await generateEmbedding(
      question.trim(),
      "RETRIEVAL_QUERY"
    );

    // Fetch only this user's knowledge
    const knowledgeEntries = await Knowledge.find({
      owner: req.user._id,
    }).select("+embedding");

    console.log(
      "Total knowledge entries:",
      knowledgeEntries.length
    );

    // Keep valid embeddings
    const entriesWithEmbeddings = knowledgeEntries.filter(
      (entry) =>
        Array.isArray(entry.embedding) &&
        entry.embedding.length === EMBEDDING_DIMENSIONS
    );

    console.log(
      "Entries with valid embeddings:",
      entriesWithEmbeddings.length
    );

    if (entriesWithEmbeddings.length === 0) {
      return res.status(200).json({
        success: true,
        question: question.trim(),
        answer:
          "Your workspace does not have any knowledge entries available for AI retrieval yet. Please add knowledge and wait for its embedding to be generated.",
        sources: [],
        retrieval: {
          minimumSimilarity: RAG_MIN_SIMILARITY,
          matchedSources: 0,
        },
      });
    }

    // Calculate similarity scores
    const scoredEntries = entriesWithEmbeddings.map((entry) => ({
      entry,
      similarity: cosineSimilarity(
        queryEmbedding,
        entry.embedding
      ),
    }));

    // Filter and rank relevant sources
    const relevantEntries = scoredEntries
      .filter(
        (item) => item.similarity >= RAG_MIN_SIMILARITY
      )
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, RAG_MAX_SOURCES);

    console.log(
      "Entries meeting relevance threshold:",
      relevantEntries.length
    );

    if (relevantEntries.length === 0) {
      console.log("No sufficiently relevant knowledge found.");
      console.log("========== RAG COMPLETED ==========\n");

      return res.status(200).json({
        success: true,
        question: question.trim(),
        answer:
          "I couldn't find sufficiently relevant information in your organizational knowledge to answer this question. Please add relevant knowledge to your workspace or try asking differently.",
        sources: [],
        retrieval: {
          minimumSimilarity: RAG_MIN_SIMILARITY,
          matchedSources: 0,
        },
      });
    }

    // Prepare relevant knowledge for Gemini
    const contextSources = relevantEntries.map(({ entry }) => ({
      title: entry.title,
      content: entry.content,
      summary: entry.summary,
    }));

    // Generate answer using conversation history
    const answer = await generateKnowledgeAnswer(
      question.trim(),
      contextSources,
      validatedHistory
    );

    // Prepare source references
    const sources = relevantEntries.map(
      ({ entry, similarity }, index) => ({
        sourceNumber: index + 1,
        id: entry._id,
        title: entry.title,
        summary: entry.summary || "",
        similarityScore: Number(similarity.toFixed(4)),
      })
    );

    console.log("RAG answer generated successfully.");
    console.log("Sources returned:", sources.length);
    console.log("========== RAG COMPLETED ==========\n");

    return res.status(200).json({
      success: true,
      question: question.trim(),
      answer,
      sources,
      retrieval: {
        minimumSimilarity: RAG_MIN_SIMILARITY,
        matchedSources: sources.length,
        conversationMessages: validatedHistory.length,
      },
    });
  } catch (error) {
    console.error("RAG assistant error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to generate an AI answer",
    });
  }
});

// Semantic search
router.post("/search", authMiddleware, async (req, res) => {
  try {
    const { query } = req.body;

    if (
      !query ||
      typeof query !== "string" ||
      !query.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "A valid search query is required",
      });
    }

    if (query.trim().length > 1000) {
      return res.status(400).json({
        success: false,
        message: "Search query cannot exceed 1000 characters",
      });
    }

    console.log("\n========== SEMANTIC SEARCH ==========");
    console.log("Search query:", query.trim());

    const queryEmbedding = await generateEmbedding(
      query.trim(),
      "RETRIEVAL_QUERY"
    );

    const knowledgeEntries = await Knowledge.find({
      owner: req.user._id,
    }).select("+embedding");

    const entriesWithEmbeddings = knowledgeEntries.filter(
      (entry) =>
        Array.isArray(entry.embedding) &&
        entry.embedding.length === EMBEDDING_DIMENSIONS
    );

    const results = entriesWithEmbeddings
      .map((entry) => ({
        entry,
        similarity: cosineSimilarity(
          queryEmbedding,
          entry.embedding
        ),
      }))
      .filter((item) => item.similarity > 0)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 10)
      .map(({ entry, similarity }) => {
        const result = entry.toObject();

        delete result.embedding;
        delete result.__v;

        return {
          ...result,
          similarityScore: Number(similarity.toFixed(4)),
        };
      });

    console.log("Search results:", results.length);
    console.log("========== SEARCH COMPLETED ==========\n");

    return res.status(200).json({
      success: true,
      query: query.trim(),
      count: results.length,
      results,
    });
  } catch (error) {
    console.error("Semantic search error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to perform semantic search",
    });
  }
});

// Get all knowledge entries belonging to the logged-in user
router.get("/", authMiddleware, async (req, res) => {
  try {
    const knowledgeEntries = await Knowledge.find({
      owner: req.user._id,
    })
      .select("-__v -embedding")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: knowledgeEntries.length,
      knowledge: knowledgeEntries,
    });
  } catch (error) {
    console.error("Fetch knowledge error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch knowledge entries",
    });
  }
});

module.exports = router;
