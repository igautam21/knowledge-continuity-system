
require("dotenv").config();

const mongoose = require("mongoose");
const Knowledge = require("./models/Knowledge");
const {
  generateEmbedding,
} = require("./services/embeddingService");

async function backfillEmbeddings() {
  try {
    console.log("Connecting to MongoDB...");

    await mongoose.connect(process.env.MONGODB_URI);

    console.log("MongoDB connected successfully.");

    // Find all knowledge entries
    const entries = await Knowledge.find({});

    console.log(`Total entries found: ${entries.length}`);

    let generated = 0;
    let skipped = 0;
    let failed = 0;

    for (const entry of entries) {
      // Preserve existing valid embeddings
      if (
        Array.isArray(entry.embedding) &&
        entry.embedding.length === 768
      ) {
        console.log(`Skipping: ${entry.title}`);
        skipped++;
        continue;
      }

      try {
        console.log(`\nGenerating embedding: ${entry.title}`);

        const textToEmbed =
          `${entry.title}\n${entry.content}`;

        const embedding = await generateEmbedding(
          textToEmbed,
          "RETRIEVAL_DOCUMENT"
        );

        entry.embedding = embedding;

        await entry.save();

        console.log(
          `Successfully saved embedding: ${entry.title}`
        );

        generated++;

        // Small delay between API requests
        await new Promise((resolve) =>
          setTimeout(resolve, 1000)
        );
      } catch (error) {
        console.error(
          `Failed: ${entry.title}`,
          error.message
        );

        failed++;
      }
    }

    console.log("\n========== BACKFILL REPORT ==========");
    console.log("Total entries:", entries.length);
    console.log("New embeddings:", generated);
    console.log("Already had embeddings:", skipped);
    console.log("Failed:", failed);
    console.log("=====================================");
  } catch (error) {
    console.error("Backfill error:", error.message);
  } finally {
    await mongoose.disconnect();
    console.log("MongoDB disconnected.");
  }
}

backfillEmbeddings();
