
const jwt = require("jsonwebtoken");
const request = require("supertest");

jest.mock("../jobs/summaryQueue", () => ({
  add: jest.fn(),
}));

jest.mock("../models/User", () => ({
  findById: jest.fn(),
}));

const User = require("../models/User");
const app = require("../app");

process.env.JWT_SECRET = "test-secret-for-automated-tests";

describe("KnowledgeHub Authentication Middleware Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/summaries", () => {
    test("should reject requests without authorization header", async () => {
      const response = await request(app)
        .get("/api/summaries");

      expect(response.statusCode).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe(
        "Authentication required. Please log in."
      );

      expect(User.findById).not.toHaveBeenCalled();
    });

    test("should reject an invalid JWT token", async () => {
      const response = await request(app)
        .get("/api/summaries")
        .set("Authorization", "Bearer invalid-token");

      expect(response.statusCode).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe(
        "Invalid or expired authentication token"
      );
    });

    test("should reject requests when the token user no longer exists", async () => {
      const token = jwt.sign(
        { userId: "deleted-user-123" },
        process.env.JWT_SECRET,
        { expiresIn: "1h" }
      );

      User.findById.mockResolvedValue(null);

      const response = await request(app)
        .get("/api/summaries")
        .set("Authorization", `Bearer ${token}`);

      expect(response.statusCode).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe(
        "User no longer exists"
      );

      expect(User.findById).toHaveBeenCalledWith(
        "deleted-user-123"
      );
    });

    test("should reject an expired JWT token", async () => {
      const token = jwt.sign(
        { userId: "test-user-123" },
        process.env.JWT_SECRET,
        { expiresIn: "-1s" }
      );

      const response = await request(app)
        .get("/api/summaries")
        .set("Authorization", `Bearer ${token}`);

      expect(response.statusCode).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe(
        "Invalid or expired authentication token"
      );

      expect(User.findById).not.toHaveBeenCalled();
    });
  });
});
