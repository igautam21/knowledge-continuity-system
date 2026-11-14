
const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// Reusable API request function
export async function apiRequest(endpoint, options = {}) {
  const token = sessionStorage.getItem("token");

  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({
    success: false,
    message: "Invalid server response",
  }));

  if (!response.ok) {
    throw new Error(data.message || "Something went wrong");
  }

  return data;
}

// Authentication APIs
export function loginUser(credentials) {
  return apiRequest("/auth/login", {
    method: "POST",
    body: JSON.stringify(credentials),
  });
}

export function registerUser(userData) {
  return apiRequest("/auth/register", {
    method: "POST",
    body: JSON.stringify(userData),
  });
}

// Knowledge APIs
export function getKnowledge() {
  return apiRequest("/summaries");
}

export function createKnowledge(knowledgeData) {
  return apiRequest("/summaries", {
    method: "POST",
    body: JSON.stringify(knowledgeData),
  });
}

// Semantic search API
export function searchKnowledge(query) {
  return apiRequest("/summaries/search", {
    method: "POST",
    body: JSON.stringify({ query }),
  });
}
