require("dotenv").config();

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Knowledge = require("../models/Knowledge");
const summaryQueue = require("../jobs/summaryQueue");

const demoEntries = [
  {
    title: "Knowledge Continuity System - Project Overview",
    content: "The Knowledge Continuity System is an organizational knowledge management platform built with React, Node.js, Express, and MongoDB Atlas. It helps organizations preserve employee knowledge during role changes and project handovers. Employees can document tasks, methodologies, technologies, challenges, and solutions. The platform provides centralized knowledge storage and an AI assistant for retrieving organizational information."
  },
  {
    title: "Backend Architecture and Authentication",
    content: "The backend uses Node.js and Express to expose REST API endpoints. MongoDB Atlas stores users, projects, and knowledge records. User authentication uses bcryptjs for password hashing and JSON Web Tokens for session authentication. Protected routes use authentication middleware to verify tokens and identify the requesting user. Knowledge records are associated with their owner."
  },
  {
    title: "AI Summarization and Background Processing",
    content: "Knowledge submissions are processed asynchronously using BullMQ and Redis. A background worker retrieves pending knowledge records, generates structured summaries using the Google Gemini API, and creates semantic embeddings. The worker updates each record with its summary, embedding, and processing status. This prevents lengthy AI operations from blocking normal API requests."
  },
  {
    title: "Semantic Search and RAG Assistant",
    content: "The application uses vector embeddings to represent organizational knowledge. Semantic search compares query embeddings with stored knowledge embeddings using cosine similarity. The RAG assistant retrieves relevant knowledge records and supplies them to Gemini as context. Responses include numbered source citations so users can identify the organizational records supporting an answer."
  },
  {
    title: "Project Handover and Knowledge Preservation",
    content: "During employee transitions, important project information can be lost. The system preserves project history, technical decisions, tools, encountered problems, and implemented solutions. A new team member can search the stored knowledge and ask questions through the AI assistant. This reduces repeated investigation and supports smoother onboarding and project continuity."
  }
];

async function seedDemoData() {
  let queueConnected = false;

  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is missing from server/.env");
    }

    if (!process.env.DEMO_USER_PASSWORD ||
        process.env.DEMO_USER_PASSWORD.length < 8) {
      throw new Error("Set DEMO_USER_PASSWORD (minimum 8 characters) in server/.env");
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB.");

    const email = (
      process.env.DEMO_USER_EMAIL || "demo@knowledgehub.local"
    ).trim().toLowerCase();

    let user = await User.findOne({ email });

    if (!user) {
      const password = await bcrypt.hash(
        process.env.DEMO_USER_PASSWORD,
        12
      );

      user = await User.create({
        name: "KnowledgeHub Demo",
        email,
        password
      });

      console.log("Created demo user:", email);
    } else {
      console.log("Demo user already exists:", email);
    }

    await summaryQueue.waitUntilReady();
    queueConnected = true;

    let created = 0;
    let queued = 0;

    for (const entry of demoEntries) {
      let knowledge = await Knowledge.findOne({
        owner: user._id,
        title: entry.title
      });

      if (!knowledge) {
        knowledge = await Knowledge.create({
          ...entry,
          owner: user._id,
          status: "pending"
        });

        created++;
        console.log("Created:", entry.title);
      }

      if (knowledge.status !== "completed") {
        const jobId = `demo-${knowledge._id}`;
        const existingJob = await summaryQueue.getJob(jobId);

        if (!existingJob) {
          await summaryQueue.add(
            "summarize-knowledge",
            {
              knowledgeId: knowledge._id.toString(),
              userId: user._id.toString()
            },
            {
              jobId,
              attempts: 3,
              backoff: {
                type: "exponential",
                delay: 5000
              },
              removeOnComplete: 100,
              removeOnFail: 100
            }
          );

          queued++;
        }
      }
    }

    console.log("\nDemo data seeding completed.");
    console.log("Demo account:", email);
    console.log("New knowledge records:", created);
    console.log("AI processing jobs queued:", queued);
    console.log("Start the backend to process pending jobs.");
  } catch (error) {
    console.error("Demo seeding failed:", error.message);
    process.exitCode = 1;
  } finally {
    if (queueConnected) {
      await summaryQueue.close();
    }

    await mongoose.disconnect();
  }
}

seedDemoData();
