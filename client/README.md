# Knowledge Continuity System

An AI-powered organizational knowledge management platform designed to preserve institutional knowledge, simplify employee handovers, and ensure project continuity.

## 1. Overview

Organizations often lose valuable knowledge when employees leave, change roles, or move between projects. Important information about tasks, workflows, technical decisions, challenges, and solutions can become difficult to retrieve.

The **Knowledge Continuity System** addresses this problem by providing a centralized platform where employees can document their work and use AI-powered tools to summarize, search, and retrieve organizational knowledge.

The system combines authentication, database management, background processing, semantic search, and Retrieval-Augmented Generation (RAG) to make organizational knowledge easier to preserve and access.

## 2. Key Features

- **User Authentication:** Secure registration and login using JWT-based authentication and password hashing.
- **Knowledge Management:** Submit and manage knowledge records containing titles and detailed work-related information.
- **AI-Powered Summarization:** Automatically generate concise summaries of submitted knowledge using Google Gemini.
- **Background Processing:** Process summarization tasks asynchronously using Redis and BullMQ.
- **Semantic Search:** Find relevant knowledge using vector embeddings and cosine similarity.
- **RAG-Based AI Assistant:** Ask natural-language questions and receive answers grounded in relevant knowledge records, with source references.
- **Conversation Context:** Maintain recent conversation history to support contextual follow-up questions.
- **API Rate Limiting:** Apply request limits to general API, authentication, and AI-powered endpoints.

## 3. Technology Stack

| Layer | Technologies |
|---|---|
| Frontend | React.js, Vite, CSS |
| Backend | Node.js, Express.js |
| Database | MongoDB Atlas, Mongoose |
| AI Integration | Google Gemini API |
| Embeddings | Gemini Embedding Model |
| Background Jobs | BullMQ |
| Queue Storage | Redis |
| Authentication | JWT, bcryptjs |
| Testing | Jest, Supertest |
| Version Control | Git, GitHub |

## 4. Capstone Concepts and Code Mapping

The project demonstrates the following five primary backend engineering concepts:

| Concept | Implementation | Code Location |
|---|---|---|
| API Endpoints | REST APIs for authentication, projects, and knowledge management | `server/app.js`, `server/routes/` |
| Database | MongoDB persistence using Mongoose models | `server/models/User.js`, `server/models/Knowledge.js`, `server/models/Project.js` |
| Authentication | Password hashing, JWT generation, and protected routes | `server/routes/authRoutes.js`, `server/middleware/authMiddleware.js` |
| Background Jobs | Asynchronous AI summarization using BullMQ and Redis | `server/jobs/summaryQueue.js`, `server/jobs/summaryWorker.js`, `server/config/redis.js` |
| LLM Integration | Gemini-powered knowledge summarization and answer generation | `server/services/aiService.js` |

### Additional Engineering Concepts

| Concept | Implementation | Code Location |
|---|---|---|
| Semantic Search | Embedding generation and cosine similarity retrieval | `server/services/embeddingService.js`, `server/routes/summaryRoutes.js` |
| RAG with Citations | Retrieve relevant knowledge and generate grounded answers with source references | `server/routes/summaryRoutes.js`, `server/services/aiService.js` |
| Automated Testing | API and middleware tests using Jest and Supertest | `server/tests/` |
| Rate Limiting | Request limits for general, authentication, and AI endpoints | `server/app.js` |

### Capstone Swaps

The project uses two additional engineering concepts beyond the five primary concepts:

1. **RAG with Citations:** Chosen instead of a conventional reporting feature because knowledge retrieval and source-grounded answers directly support the project's knowledge-continuity objective.
2. **Automated Test Suite:** Chosen to improve reliability and verify authentication, knowledge management, middleware, and RAG behavior.

## 5. System Architecture

```text
                  React Frontend
                        |
                        v
                 Express REST API
                        |
          +-------------+-------------+
          |             |             |
          v             v             v
       MongoDB       JWT Auth    Rate Limiting
          |
          v
    Knowledge Records
          |
          v
      BullMQ Queue
          |
          v
      Redis Server
          |
          v
   Background Worker
          |
          v
       Gemini API
          |
      +---+---+
      |       |
      v       v
   Summary  Embeddings
               |
               v
        Semantic Search
               |
               v
         RAG Assistant
               |
               v
       Answer with Sources
```

## 6. Project Structure

```text
knowledge-continuity-system/
│
├── client/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── services/
│   │   ├── assets/
│   │   ├── App.jsx
│   │   ├── App.css
│   │   └── main.jsx
│   ├── package.json
│   └── .gitignore
│
├── server/
│   ├── config/
│   │   └── redis.js
│   ├── jobs/
│   │   ├── summaryQueue.js
│   │   └── summaryWorker.js
│   ├── middleware/
│   ├── models/
│   │   ├── User.js
│   │   ├── Knowledge.js
│   │   └── Project.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── projectRoutes.js
│   │   └── summaryRoutes.js
│   ├── services/
│   │   ├── aiService.js
│   │   └── embeddingService.js
│   ├── tests/
│   ├── app.js
│   ├── server.js
│   ├── package.json
│   └── .env.example
│
├── .gitignore
├── README.md
└── My 10x Solution - Gautam Yadav.md
```

## 7. Getting Started

### Prerequisites

Install or configure the following:

- Node.js 22 or a compatible version
- npm
- MongoDB Atlas account or a MongoDB instance
- Redis server
- Docker (recommended for running Redis)
- Google Gemini API key

### Step 1: Clone the Repository

```bash
git clone https://github.com/igautam21/knowledge-continuity-system.git

cd knowledge-continuity-system
```

### Step 2: Install Backend Dependencies

```bash
cd server

npm install
```

### Step 3: Configure Environment Variables

Create a `.env` file inside the `server` directory.

Use the following configuration as a template:

```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_secure_jwt_secret
GEMINI_API_KEY=your_gemini_api_key
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
```

Replace the placeholder values with your own credentials.

**Security:** Never commit your actual `.env` file, MongoDB connection string, JWT secret, or Gemini API key to GitHub.

The repository includes `server/.env.example` for configuration reference.

### Step 4: Start Redis

If Docker is installed, run:

```bash
docker run -d --name knowledge-redis -p 6379:6379 redis:7-alpine
```

If the container already exists, start it with:

```bash
docker start knowledge-redis
```

Verify Redis connectivity:

```bash
docker exec knowledge-redis redis-cli ping
```

Expected response:

```text
PONG
```

### Step 5: Start the Backend

From the `server` directory:

```bash
npm start
```

The backend runs at:

```text
http://localhost:5000
```

The backend connects to MongoDB and starts the background summarization worker.

### Step 6: Install and Start the Frontend

Open a new terminal from the project root:

```bash
cd client

npm install

npm run dev
```

The frontend runs at:

```text
http://localhost:5173
```

Open the application in your browser.

## 8. API Endpoints

All protected endpoints require a valid JWT Bearer token.

### Authentication

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register a new user |
| POST | `/api/auth/login` | Authenticate an existing user |

### Projects

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/projects` | Retrieve projects |
| POST | `/api/projects` | Create a project |

### Knowledge and AI

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/summaries` | Retrieve knowledge records |
| POST | `/api/summaries` | Submit knowledge for AI summarization |
| POST | `/api/summaries/search` | Perform semantic knowledge search |
| POST | `/api/summaries/ask` | Ask the RAG-based AI assistant |

### Health Checks

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Check API availability |
| GET | `/api/db-health` | Check database connectivity |

## 9. Background Processing Workflow

1. An authenticated user submits a knowledge record.
2. The backend stores the record in MongoDB.
3. A summarization job is added to the BullMQ queue.
4. A background worker retrieves the job.
5. Gemini generates a summary and document embedding.
6. The worker saves the summary and embedding to MongoDB.
7. The record becomes available for semantic search and RAG-based question answering.

This asynchronous workflow prevents AI summarization from blocking the main API request.

## 10. Semantic Search and RAG

The system uses embedding vectors to represent knowledge records and user queries.

### Semantic Search

1. The user enters a natural-language search query.
2. The query is converted into an embedding.
3. The backend compares the query embedding with stored knowledge embeddings.
4. Cosine similarity is calculated to measure relevance.
5. The most relevant knowledge records are returned.

### RAG-Based AI Assistant

1. The user asks a question through the AI Assistant.
2. The question is converted into an embedding.
3. Relevant knowledge records are retrieved from the user's workspace.
4. Retrieved records are supplied as context to Gemini.
5. Gemini generates an answer grounded in the retrieved knowledge.
6. The API returns the answer with supporting source references.

The retrieval process is scoped to the authenticated user's knowledge records.

## 11. Five-Minute Demo Walkthrough

Use the following workflow to demonstrate the main capabilities of the application.

| Time | Demonstration | What to Show |
|---|---|---|
| 0:00–0:40 | Authentication | Register or log in to the application |
| 0:40–1:30 | Knowledge Capture | Add a new knowledge entry with a title and detailed content |
| 1:30–2:15 | Background Processing | Show the entry's pending/processing status and generated AI summary |
| 2:15–3:15 | Semantic Search | Search using a natural-language query related to the saved knowledge |
| 3:15–4:30 | RAG Assistant | Ask a question and demonstrate the generated answer and source references |
| 4:30–5:00 | Architecture and Testing | Briefly explain the backend workflow and automated test results |

### Suggested Synthetic Demo Data

For a demonstration, create sample knowledge entries using fictional organizational information.

**Example 1: Application Deployment Workflow**

Title:

```text
Application Deployment Workflow
```

Content:

```text
The fictional engineering team deploys its web application
using a development, staging, and production workflow.

Developers first push changes to the Git repository.
The changes are reviewed and tested before deployment
to the staging environment.

After successful verification, the release is deployed
to the production environment.

The backend uses Node.js and Express, while MongoDB
is used for application data storage.
```

**Example 2: Database Backup and Recovery**

Title:

```text
Database Backup and Recovery Process
```

Content:

```text
The fictional infrastructure team maintains regular
database backups to support recovery.

Backups are verified periodically, and recovery procedures
are documented for the engineering team.

Access to backup systems is restricted to authorized
team members.
```

**Example 3: New Developer Onboarding**

Title:

```text
New Developer Onboarding Process
```

Content:

```text
New developers begin by reviewing the project architecture,
repository structure, coding conventions, and development setup.

They configure the local environment, run the application,
and review the documented deployment and troubleshooting
procedures before contributing to the project.
```

These are sample records to create through the application. They are not automatically seeded into the database.

## 12. Testing

The backend uses Jest and Supertest for automated testing.

Run the test suite from the `server` directory:

```bash
npm test
```

The current automated test suite contains 27 tests across six test suites.

Tests cover:

- API health checks
- User authentication
- Knowledge management
- RAG-based question answering
- Authentication middleware
- Rate-limiting behavior

Latest verified result:

```text
Test Suites: 6 passed, 6 total
Tests:       27 passed, 27 total
Snapshots:   0 total
```

## 13. Security Considerations

- Passwords are hashed using bcrypt.
- JWT authentication protects private API routes.
- Environment variables are used for sensitive configuration.
- Rate limiting helps protect API endpoints from excessive requests.
- Knowledge retrieval is scoped to the authenticated user.
- AI responses use retrieved knowledge as their context.
- Environment files and dependency directories are excluded through `.gitignore`.

## 14. Limitations and Future Improvements

Current limitations and possible future enhancements include:

- Persistent storage for conversation history.
- More advanced knowledge analytics and reporting.
- Role-based access control for organizational teams.
- Improved document ingestion and knowledge extraction.
- Production-ready deployment with centralized rate-limit storage.

## 15. Author

**Gautam Yadav**

GitHub: [@igautam21](https://github.com/igautam21)

Project Repository: [Knowledge Continuity System](https://github.com/igautam21/knowledge-continuity-system)

---

*Built as an AI Engineering project focused on organizational knowledge preservation and project continuity.*