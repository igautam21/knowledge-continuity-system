
const { GoogleGenAI } = require("@google/genai");

if (!process.env.GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY is missing from environment variables");
}

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    timeout: 90000,
    retryOptions: {
      attempts: 1,
    },
  },
});

const EMBEDDING_MODEL = "gemini-embedding-001";
const EMBEDDING_DIMENSIONS = 768;

async function generateEmbedding(
  text,
  taskType = "RETRIEVAL_DOCUMENT"
) {
  if (!text || typeof text !== "string" || !text.trim()) {
    throw new Error("Text cannot be empty when generating an embedding");
  }

  try {
    console.log("Generating embedding with Gemini...");
    console.log("Task type:", taskType);

    const response = await ai.models.embedContent({
      model: EMBEDDING_MODEL,
      contents: text.trim(),
      config: {
        taskType,
        outputDimensionality: EMBEDDING_DIMENSIONS,
      },
    });

    const embedding = response.embeddings?.[0]?.values;

    if (!embedding || embedding.length !== EMBEDDING_DIMENSIONS) {
      throw new Error("Invalid embedding returned by Gemini");
    }

    console.log("Embedding generated successfully!");
    console.log("Embedding dimensions:", embedding.length);

    return embedding;
  } catch (error) {
    console.error("Embedding generation error:", error.message);
    throw new Error(`Embedding generation failed: ${error.message}`);
  }
}

module.exports = {
  generateEmbedding,
};
