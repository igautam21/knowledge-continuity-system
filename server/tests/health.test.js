const request = require("supertest");

// Mock the BullMQ queue so tests don't open a Redis connection.
jest.mock("../jobs/summaryQueue", () => ({
  add: jest.fn(),
}));

const app = require("../app");

describe("KnowledgeHub API Health Tests", () => {
  test("GET /api/health should return 200", async () => {
    const response = await request(app).get("/api/health");

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe(
      "Knowledge Continuity API is running"
    );
  });

  test("GET /api/db-health should return a valid response", async () => {
    const response = await request(app).get("/api/db-health");

    expect([200, 503]).toContain(response.statusCode);
    expect(response.body).toHaveProperty("success");
    expect(response.body).toHaveProperty("message");
  });
});