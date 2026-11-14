
const request = require("supertest");

jest.mock("../jobs/summaryQueue", () => ({
  add: jest.fn(),
}));

jest.mock("../models/Knowledge", () => ({
  create: jest.fn(),
  find: jest.fn(),
}));

jest.mock("../middleware/authMiddleware", () =>
  jest.fn((req, res, next) => {
    req.user = {
      _id: "test-user-123",
    };
    next();
  })
);

const Knowledge = require("../models/Knowledge");
const summaryQueue = require("../jobs/summaryQueue");
const app = require("../app");

describe("KnowledgeHub Knowledge API Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /api/summaries", () => {
    test("should reject knowledge submission without required fields", async () => {
      const response = await request(app)
        .post("/api/summaries")
        .send({
          title: "Test Knowledge",
        });

      expect(response.statusCode).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe(
        "Title and knowledge content are required"
      );
    });

    test("should reject a title longer than 150 characters", async () => {
      const response = await request(app)
        .post("/api/summaries")
        .send({
          title: "A".repeat(151),
          content: "This is test knowledge content.",
        });

      expect(response.statusCode).toBe(400);
      expect(response.body.message).toBe(
        "Title cannot exceed 150 characters"
      );
    });

    test("should save knowledge and queue a summary job", async () => {
      const mockKnowledge = {
        _id: "knowledge-123",
        title: "Deployment Guide",
        content: "Our team deploys using Docker.",
        owner: "test-user-123",
        status: "pending",
        save: jest.fn(),
      };

      Knowledge.create.mockResolvedValue(mockKnowledge);

      summaryQueue.add.mockResolvedValue({
        id: "job-123",
      });

      const response = await request(app)
        .post("/api/summaries")
        .send({
          title: "Deployment Guide",
          content: "Our team deploys using Docker.",
        });

      expect(response.statusCode).toBe(202);
      expect(response.body.success).toBe(true);
      expect(response.body.knowledgeId).toBe("knowledge-123");
      expect(response.body.jobId).toBe("job-123");
      expect(response.body.status).toBe("pending");

      expect(Knowledge.create).toHaveBeenCalledWith({
        title: "Deployment Guide",
        content: "Our team deploys using Docker.",
        owner: "test-user-123",
        status: "pending",
      });

      expect(summaryQueue.add).toHaveBeenCalled();
    });
  });

  describe("GET /api/summaries", () => {
    test("should return knowledge entries belonging to the logged-in user", async () => {
      const mockKnowledge = [
        {
          _id: "knowledge-123",
          title: "Deployment Guide",
          content: "Our team deploys using Docker.",
          status: "completed",
        },
      ];

      const sortMock = jest.fn().mockResolvedValue(mockKnowledge);
      const selectMock = jest.fn().mockReturnValue({
        sort: sortMock,
      });

      Knowledge.find.mockReturnValue({
        select: selectMock,
      });

      const response = await request(app)
        .get("/api/summaries");

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.count).toBe(1);
      expect(response.body.knowledge).toHaveLength(1);

      expect(Knowledge.find).toHaveBeenCalledWith({
        owner: "test-user-123",
      });

      expect(selectMock).toHaveBeenCalledWith("-__v -embedding");
    });

    test("should return an empty list when no knowledge exists", async () => {
      const sortMock = jest.fn().mockResolvedValue([]);
      const selectMock = jest.fn().mockReturnValue({
        sort: sortMock,
      });

      Knowledge.find.mockReturnValue({
        select: selectMock,
      });

      const response = await request(app)
        .get("/api/summaries");

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.count).toBe(0);
      expect(response.body.knowledge).toEqual([]);
    });
  });
});
