
require("dotenv").config();

const { generateEmbedding } = require("./services/embeddingService");

async function testEmbedding() {
  try {
    const text =
      "The team deploys its React application using Docker and AWS.";

    console.log("Generating test embedding...");

    const embedding = await generateEmbedding(
      text,
      "RETRIEVAL_DOCUMENT"
    );

    console.log("Embedding generated successfully!");
    console.log("Vector dimensions:", embedding.length);
    console.log("First five values:", embedding.slice(0, 5));
  } catch (error) {
    console.error("Test failed:", error.message);
  }
}

testEmbedding();