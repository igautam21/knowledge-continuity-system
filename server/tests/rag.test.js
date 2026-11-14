
const request = require("supertest");

jest.mock("../jobs/summaryQueue", () => ({
  add: jest.fn(),
}));

jest.mock("../models/Knowledge", () => ({
  find: jest.fn(),
}));

jest.mock("../middleware/authMiddleware", () =>
  jest.fn((req, res, next) => {
    req.user = { _id: "test-user-123" };
    next();
  })
);

jest.mock("../services/embeddingService", () => ({
  generateEmbedding: jest.fn(),
}));

jest.mock("../services/aiService", () => ({
  generateKnowledgeAnswer: jest.fn(),
}));

const Knowledge = require("../models/Knowledge");
const { generateEmbedding } = require("../services/embeddingService");
const { generateKnowledgeAnswer } = require("../services/aiService");
const app = require("../app");

const createEmbedding = (firstValue = 1) => {
  const embedding = new Array(768).fill(0);
  embedding[0] = firstValue;
  return embedding;
};

const createKnowledgeEntry = (id, title, embedding) => ({
  _id: id,
  title,
  content: "Our team deploys applications using Docker.",
  summary: "Docker deployment process.",
  embedding,
  toObject() {
    return {
      _id: this._id,
      title: this.title,
      content: this.content,
      summary: this.summary,
      embedding: this.embedding,
    };
  },
});

describe("KnowledgeHub Semantic Search and RAG Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    generateEmbedding.mockResolvedValue(createEmbedding());
    generateKnowledgeAnswer.mockResolvedValue(
      "Our team uses Docker for deployment. [Source 1]"
    );
  });

  describe("POST /api/summaries/search", () => {
    test("should reject an empty search query", async () => {
      const response = await request(app)
        .post("/api/summaries/search")
        .send({ query: " " });

      expect(response.statusCode).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe(
        "A valid search query is required"
      );
    });

    test("should reject a search query longer than 1000 characters", async () => {
      const response = await request(app)
        .post("/api/summaries/search")
        .send({ query: "a".repeat(1001) });

      expect(response.statusCode).toBe(400);
      expect(response.body.message).toBe(
        "Search query cannot exceed 1000 characters"
      );
    });

    test("should return matching semantic search results", async () => {
      const entry = createKnowledgeEntry(
        "knowledge-123",
        "Docker Deployment",
        createEmbedding()
      );

      const selectMock = jest.fn().mockResolvedValue([entry]);

      Knowledge.find.mockReturnValue({
        select: selectMock,
      });

      const response = await request(app)
        .post("/api/summaries/search")
        .send({ query: "How do we deploy applications?" });

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.count).toBe(1);
      expect(response.body.results[0].title).toBe(
        "Docker Deployment"
      );
      expect(response.body.results[0].similarityScore).toBe(1);

      expect(generateEmbedding).toHaveBeenCalledWith(
        "How do we deploy applications?",
        "RETRIEVAL_QUERY"
      );

      expect(response.body.results[0]).not.toHaveProperty("embedding");
    });
  });

  describe("POST /api/summaries/ask", () => {
    test("should reject an empty question", async () => {
      const response = await request(app)
        .post("/api/summaries/ask")
        .send({ question: " " });

      expect(response.statusCode).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe(
        "A valid question is required"
      );
    });

    test("should reject invalid conversation history", async () => {
      const response = await request(app)
        .post("/api/summaries/ask")
        .send({
          question: "How do we deploy?",
          conversationHistory: "invalid-history",
        });

      expect(response.statusCode).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe(
        "Conversation history must be an array"
      );
    });

    test("should return an informational response when workspace is empty", async () => {
      const selectMock = jest.fn().mockResolvedValue([]);

      Knowledge.find.mockReturnValue({
        select: selectMock,
      });

      const response = await request(app)
        .post("/api/summaries/ask")
        .send({
          question: "How do we deploy applications?",
        });

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.sources).toEqual([]);
      expect(response.body.retrieval.matchedSources).toBe(0);

      expect(generateKnowledgeAnswer).not.toHaveBeenCalled();
    });

    test("should generate an AI answer with relevant sources", async () => {
      const entry = createKnowledgeEntry(
        "knowledge-123",
        "Docker Deployment",
        createEmbedding()
      );

      const selectMock = jest.fn().mockResolvedValue([entry]);

      Knowledge.find.mockReturnValue({
        select: selectMock,
      });

      const response = await request(app)
        .post("/api/summaries/ask")
        .send({
          question: "How do we deploy applications?",
          conversationHistory: [
            {
              role: "user",
              content: "Tell me about our deployment process.",
            },
          ],
        });

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.answer).toContain("Docker");
      expect(response.body.sources).toHaveLength(1);
      expect(response.body.sources[0].title).toBe(
        "Docker Deployment"
      );
      expect(response.body.retrieval.matchedSources).toBe(1);
      expect(response.body.retrieval.conversationMessages).toBe(1);

      expect(generateKnowledgeAnswer).toHaveBeenCalledWith(
        "How do we deploy applications?",
        expect.arrayContaining([
          expect.objectContaining({
            title: "Docker Deployment",
          }),
        ]),
        [
          {
            role: "user",
            content: "Tell me about our deployment process.",
          },
        ]
      );
    });
  });
});
