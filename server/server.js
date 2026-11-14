
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();

const app = express();

// Start background summary worker
require("./jobs/summaryWorker");

// Middleware
app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

// Authentication routes
const authRoutes = require("./routes/authRoutes");
app.use("/api/auth", authRoutes);

// Project routes
const projectRoutes = require("./routes/projectRoutes");
app.use("/api/projects", projectRoutes);

// Summary routes
const summaryRoutes = require("./routes/summaryRoutes");
app.use("/api/summaries", summaryRoutes);

// Health-check route
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Knowledge Continuity API is running",
  });
});

// Check MongoDB connection
app.get("/api/db-health", (req, res) => {
  const connected = mongoose.connection.readyState === 1;

  res.status(connected ? 200 : 503).json({
    success: connected,
    message: connected
      ? "MongoDB Atlas connected successfully"
      : "MongoDB is not connected",
  });
});

// Connect to MongoDB, then start the server
const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB Atlas connected successfully");

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  }
}

startServer();
