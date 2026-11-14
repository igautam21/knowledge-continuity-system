
const request = require("supertest");
const bcrypt = require("bcryptjs");

// Prevent tests from opening a real Redis connection.
jest.mock("../jobs/summaryQueue", () => ({
  add: jest.fn(),
}));

// Mock the MongoDB User model.
jest.mock("../models/User", () => ({
  findOne: jest.fn(),
  create: jest.fn(),
}));

const User = require("../models/User");
const app = require("../app");

process.env.JWT_SECRET = "test-secret-for-automated-tests";

describe("KnowledgeHub Authentication API Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /api/auth/register", () => {
    test("should reject registration when required fields are missing", async () => {
      const response = await request(app)
        .post("/api/auth/register")
        .send({
          name: "Gautam",
        });

      expect(response.statusCode).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe(
        "Name, email and password are required"
      );
    });

    test("should successfully register a new user", async () => {
      User.findOne.mockResolvedValue(null);

      User.create.mockImplementation(async (userData) => ({
        _id: "test-user-123",
        name: userData.name,
        email: userData.email,
      }));

      const response = await request(app)
        .post("/api/auth/register")
        .send({
          name: "Gautam Yadav",
          email: "gautam.test@example.com",
          password: "TestPassword123",
        });

      expect(response.statusCode).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.token).toBeDefined();
      expect(response.body.user.email).toBe(
        "gautam.test@example.com"
      );

      expect(User.create).toHaveBeenCalled();
    });

    test("should reject registration if user already exists", async () => {
      User.findOne.mockResolvedValue({
        email: "gautam.test@example.com",
      });

      const response = await request(app)
        .post("/api/auth/register")
        .send({
          name: "Gautam Yadav",
          email: "gautam.test@example.com",
          password: "TestPassword123",
        });

      expect(response.statusCode).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("User already exists");
      expect(User.create).not.toHaveBeenCalled();
    });
  });

  describe("POST /api/auth/login", () => {
    test("should reject login when required fields are missing", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send({
          email: "gautam.test@example.com",
        });

      expect(response.statusCode).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test("should successfully login with correct credentials", async () => {
      const hashedPassword = await bcrypt.hash(
        "TestPassword123",
        12
      );

      const mockUser = {
        _id: "test-user-123",
        name: "Gautam Yadav",
        email: "gautam.test@example.com",
        password: hashedPassword,
      };

      User.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUser),
      });

      const response = await request(app)
        .post("/api/auth/login")
        .send({
          email: "gautam.test@example.com",
          password: "TestPassword123",
        });

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Login successful");
      expect(response.body.token).toBeDefined();
      expect(response.body.user.email).toBe(
        "gautam.test@example.com"
      );
    });

    test("should reject login with incorrect password", async () => {
      const hashedPassword = await bcrypt.hash(
        "CorrectPassword123",
        12
      );

      const mockUser = {
        _id: "test-user-123",
        name: "Gautam Yadav",
        email: "gautam.test@example.com",
        password: hashedPassword,
      };

      User.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUser),
      });

      const response = await request(app)
        .post("/api/auth/login")
        .send({
          email: "gautam.test@example.com",
          password: "WrongPassword123",
        });

      expect(response.statusCode).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe(
        "Invalid email or password"
      );
    });
  });
});
