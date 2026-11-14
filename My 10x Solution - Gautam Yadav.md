# My 10x Solution - Gautam Yadav

## Project: AI-Powered Organizational Knowledge Transfer and Project Continuity System

**GitHub Repository:** https://github.com/igautam21/knowledge-continuity-system

### 1. What problem am I solving?

Organizations accumulate valuable knowledge through employees' daily work, project activities, technical decisions, troubleshooting, and problem-solving. However, this knowledge is often scattered across documents, conversations, and individual employees.

When employees leave, change roles, or move to another project, important information can be lost. New employees then spend unnecessary time understanding existing workflows, finding solutions to previously solved problems, and learning project history.

I am solving this problem by building an AI-powered Knowledge Continuity System that centralizes organizational knowledge and makes it easier to capture, summarize, search, and retrieve.

**My 10x claim:** Make finding and understanding previously documented organizational knowledge significantly faster through AI-powered summarization, semantic search, and contextual question answering. This improvement is a design goal; I have not yet measured a 10x performance benchmark.

### 2. How did I implement my solution?

I built a full-stack web application using React, Node.js, Express, and MongoDB Atlas.

Users can register and log in, create projects, and submit knowledge records containing titles and detailed information about their work. Once a knowledge record is submitted, the backend stores it in MongoDB and adds a summarization task to a BullMQ queue.

A background worker retrieves the task and uses the Google Gemini API to generate a concise summary and an embedding vector. The summary and embedding are saved with the knowledge record.

For knowledge discovery, the application generates embeddings for user queries and compares them with stored document embeddings using cosine similarity. The most relevant records are retrieved and passed to the RAG-based AI assistant, which generates contextual answers and returns supporting source records.

The backend also includes authentication middleware, request validation, rate limiting, and automated tests.

### 3. Engineering concepts implemented

| Concept | Implementation |
|---|---|
| API Endpoints | REST APIs using Express for authentication, projects, knowledge management, search, and AI question answering. |
| Database | MongoDB Atlas with Mongoose models for users, projects, and knowledge records. |
| Authentication | JWT-based authentication, bcrypt password hashing, and protected routes. |
| Background Jobs | BullMQ and Redis process AI summarization tasks asynchronously with retry handling. |
| LLM Integration | Google Gemini generates knowledge summaries and contextual AI responses. |

**Additional concepts used as swaps:**

- **RAG with citations:** Replaces the reporting concept because the application's primary purpose is retrieving organizational knowledge and answering questions grounded in stored records, rather than generating PDF or email reports.
- **Test suite:** Adds automated coverage for authentication, knowledge management, RAG, middleware, health checks, and rate-limiting behavior.

The backend test suite currently contains 27 passing tests across 6 test suites.

### 4. Technology Stack

- **Frontend:** React.js, Vite, CSS
- **Backend:** Node.js, Express.js
- **Database:** MongoDB Atlas, Mongoose
- **AI:** Google Gemini API and Gemini Embeddings
- **Background Processing:** BullMQ and Redis
- **Authentication:** JWT and bcryptjs
- **Testing:** Jest and Supertest

### 5. How to run the project

**Prerequisites:** Node.js, npm, MongoDB Atlas, Redis, and a Google Gemini API key.

1. Clone the repository:

   `git clone https://github.com/igautam21/knowledge-continuity-system.git`

2. Install backend dependencies:

   `cd knowledge-continuity-system/server`

   `npm install`

3. Create a `.env` file inside the `server` directory using `server/.env.example` as a reference. Configure the MongoDB URI, JWT secret, Gemini API key, and other required settings.

4. Start Redis locally or through Docker:

   `docker run -d --name knowledge-redis -p 6379:6379 redis:7-alpine`

5. Start the backend:

   `npm start`

6. Open another terminal, install frontend dependencies, and start the frontend:

   `cd knowledge-continuity-system/client`

   `npm install`

   `npm run dev`

7. Open `http://localhost:5173` in your browser.

**Run backend tests:** From the `server` directory, execute `npm test`.

### 6. Non-goal

This project does not aim to build a complete enterprise HR management system or implement complex organization-wide role hierarchies. Its primary focus is preserving, organizing, and retrieving project-related knowledge.

### 7. Conclusion

The Knowledge Continuity System demonstrates how backend engineering, asynchronous processing, database design, authentication, and generative AI can work together to solve a practical organizational problem.

The project focuses on reducing knowledge loss, simplifying employee handovers, and making existing organizational knowledge easier to access and understand.

**Author:** Gautam Yadav  
**GitHub:** https://github.com/igautam21