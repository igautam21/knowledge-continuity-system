
const { Worker } = require("bullmq");
const redisConnection = require("../config/redis");
const Knowledge = require("../models/Knowledge");

const {
  generateKnowledgeSummary,
} = require("../services/aiService");

const {
  generateEmbedding,
} = require("../services/embeddingService");

const summaryWorker = new Worker(
  "knowledge-summary",
  async (job) => {
    const { knowledgeId, userId } = job.data;

    console.log("Processing knowledge:", knowledgeId);

    console.log(
      `Attempt ${job.attemptsMade + 1} of ${job.opts.attempts || 1}`
    );

    const knowledge = await Knowledge.findOne({
      _id: knowledgeId,
      owner: userId,
    });

    if (!knowledge) {
      throw new Error("Knowledge record not found");
    }

    try {
      // Mark as processing
      knowledge.status = "processing";
      await knowledge.save();

      // Generate AI summary
      console.log("Generating AI summary using Gemini...");

      const summary = await generateKnowledgeSummary(
        knowledge.content
      );

      // Generate semantic embedding
      console.log("Generating semantic embedding...");

      const embedding = await generateEmbedding(
        `${knowledge.title}\n${knowledge.content}`,
        "RETRIEVAL_DOCUMENT"
      );

      // Save both results together
      knowledge.summary = summary;
      knowledge.embedding = embedding;
      knowledge.status = "completed";

      await knowledge.save();

      console.log("AI summary saved successfully:", knowledgeId);
      console.log("Embedding saved successfully:", knowledgeId);

      return {
        knowledgeId,
        summary,
        embeddingDimensions: embedding.length,
        status: "completed",
        processedAt: new Date().toISOString(),
      };
    } catch (error) {
      // Mark as failed only after the final attempt
      const maxAttempts = job.opts.attempts || 1;

      const isFinalAttempt =
        job.attemptsMade + 1 >= maxAttempts;

      if (isFinalAttempt) {
        knowledge.status = "failed";
        await knowledge.save();

        console.error(
          "All retry attempts exhausted for:",
          knowledgeId
        );
      } else {
        knowledge.status = "processing";
        await knowledge.save();

        console.log(
          "AI processing failed. BullMQ will retry this job."
        );
      }

      throw error;
    }
  },
  {
    connection: redisConnection,
  }
);

summaryWorker.on("completed", (job, result) => {
  console.log(`Job ${job.id} completed successfully`);
  console.log("AI Summary:", result.summary);
  console.log(
    "Embedding dimensions:",
    result.embeddingDimensions
  );
});

summaryWorker.on("failed", (job, error) => {
  console.error(
    `Job ${job?.id} failed:`,
    error.message
  );
});

module.exports = summaryWorker;
