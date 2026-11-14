
const request = require("supertest");

jest.mock("../jobs/summaryQueue", () => ({
  add: jest.fn(),
}));

jest.mock("../models/User", () => ({
  findOne: jest.fn(),
}));

jest.mock("../middleware/authMiddleware", () =>
  jest.fn((req, res, next) => {
    req.user = { _id: "test-user-123" };
    next();
  })
);

jest.mock("../models/Knowledge", () => ({
  find: jest.fn(),
}));

jest.mock("../services/embeddingService", () => ({
  generateEmbedding: jest.fn(),
}));

jest.mock("../services/aiService", () => ({
  generateKnowledgeAnswer: jest.fn(),
}));

const express = require("express");
const rateLimit = require("express-rate-limit");
const app = require("../app");

describe("KnowledgeHub Rate Limiting Tests", () => {
  test("general API limiter should return 429 after the configured limit", async () => {
    const testApp = express();

    const limiter = rateLimit({
      windowMs: 60 * 1000,
      limit: 2,
      standardHeaders: "draft-8",
      legacyHeaders: false,
    });

    testApp.use("/api", limiter);

    testApp.get("/api/test", (req, res) => {
      res.status(200).json({ success: true });
    });

    const first = await request(testApp).get("/api/test");
    const second = await request(testApp).get("/api/test");
    const third = await request(testApp).get("/api/test");

    expect(first.statusCode).toBe(200);
    expect(second.statusCode).toBe(200);
    expect(third.statusCode).toBe(429);
  });

  test("authentication limiter should block excessive login attempts", async () => {
    const testApp = express();

    testApp.use(express.json());

    const limiter = rateLimit({
      windowMs: 60 * 1000,
      limit: 2,
      standardHeaders: "draft-8",
      legacyHeaders: false,
      message: {
        success: false,
        message: "Too many authentication attempts. Please try again after 15 minutes.",
      },
    });

    testApp.use("/api/auth", limiter);

    testApp.post("/api/auth/login", (req, res) => {
      res.status(200).json({ success: true });
    });

    const first = await request(testApp)
      .post("/api/auth/login")
      .send({});

    const second = await request(testApp)
      .post("/api/auth/login")
      .send({});

    const third = await request(testApp)
      .post("/api/auth/login")
      .send({});

    expect(first.statusCode).toBe(200);
    expect(second.statusCode).toBe(200);
    expect(third.statusCode).toBe(429);
    expect(third.body.success).toBe(false);
  });

  test("AI limiter should block excessive AI requests", async () => {
    const testApp = express();

    const limiter = rateLimit({
      windowMs: 60 * 1000,
      limit: 2,
      standardHeaders: "draft-8",
      legacyHeaders: false,
      message: {
        success: false,
        message: "AI request limit reached. Please try again later.",
      },
    });

    testApp.use("/api/ai", limiter);

    testApp.post("/api/ai/ask", (req, res) => {
      res.status(200).json({ success: true });
    });

    const first = await request(testApp).post("/api/ai/ask");
    const second = await request(testApp).post("/api/ai/ask");
    const third = await request(testApp).post("/api/ai/ask");

    expect(first.statusCode).toBe(200);
    expect(second.statusCode).toBe(200);
    expect(third.statusCode).toBe(429);
    expect(third.body.message).toBe(
      "AI request limit reached. Please try again later."
    );
  });
});
