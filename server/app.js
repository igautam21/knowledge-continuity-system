
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const rateLimit = require("express-rate-limit");

require("dotenv").config();

const app = express();

// CORS configuration
app.use(
  cors({
    origin: "http://localhost:5173",
  })
);

app.use(express.json());

// General API rate limiter
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 200,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests. Please try again later.",
  },
});

// Authentication rate limiter
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many authentication attempts. Please try again after 15 minutes.",
  },
});

// AI endpoints rate limiter
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    message: "AI request limit reached. Please try again later.",
  },
});

// Apply general rate limiter to API routes
app.use("/api", generalLimiter);

// Authentication routes
const authRoutes = require("./routes/authRoutes");
app.use("/api/auth", authLimiter, authRoutes);

// Project routes
const projectRoutes = require("./routes/projectRoutes");
app.use("/api/projects", projectRoutes);

// Summary and knowledge routes
const summaryRoutes = require("./routes/summaryRoutes");

// Apply stricter limits to AI-powered endpoints
app.use("/api/summaries/ask", aiLimiter);
app.use("/api/summaries/search", aiLimiter);

app.use("/api/summaries", summaryRoutes);

// Health Check
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Knowledge Continuity API is running",
  });
});

// Database Health Check
app.get("/api/db-health", (req, res) => {
  const connected = mongoose.connection.readyState === 1;

  res.status(connected ? 200 : 503).json({
    success: connected,
    message: connected
      ? "MongoDB Atlas connected successfully"
      : "MongoDB is not connected",
  });
});

module.exports = app;
