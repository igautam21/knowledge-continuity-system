# Knowledge Continuity System

An AI-powered organizational knowledge management platform designed to preserve institutional knowledge, simplify employee handovers, and ensure project continuity.

## Overview

Organizations often lose valuable knowledge when employees leave, change roles, or move between projects. Important information about tasks, workflows, technical decisions, challenges, and solutions can become difficult to retrieve.

The **Knowledge Continuity System** addresses this problem by providing a centralized platform where employees can document their work and use AI-powered tools to summarize, search, and retrieve organizational knowledge.

## Key Features

- **User Authentication:** Secure registration and login using JWT-based authentication and password hashing.
- **Knowledge Management:** Submit and manage knowledge records containing titles and detailed work-related information.
- **AI-Powered Summarization:** Automatically generate concise summaries of submitted knowledge using Google Gemini.
- **Background Processing:** Process summarization tasks asynchronously using Redis and BullMQ.
- **Semantic Search:** Find relevant knowledge using vector embeddings and cosine similarity.
- **RAG-Based AI Assistant:** Ask natural-language questions and receive answers grounded in relevant knowledge records, with source references.
- **Conversation Context:** Maintain recent conversation history to support contextual follow-up questions.
- **API Rate Limiting:** Apply request limits to general API, authentication, and AI-powered endpoints.

## Technology Stack

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

## System Architecture

```text
                React Frontend
                      |
                      v
               Express REST API
                      |
          +-----------+-----------+
          |           |           |
          v           v           v
       MongoDB      JWT Auth    Rate Limiting
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
     +----+-----+
     |          |
     v          v
  Summary   Embeddings
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

## Project Structure

```text
knowledge-continuity-system/
│
├── client/
│   ├── public/
│   └── src/
│       ├── components/
│       ├── services/
│       ├── assets/
│       ├── App.jsx
│       ├── App.css
│       └── main.jsx
│
├── server/
│   ├── config/
│   ├── jobs/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── services/
│   ├── tests/
│   ├── app.js
│   └── server.js
│
└── README.md
```

## Getting Started

### Prerequisites

Install the following:

- Node.js (22 or compatible version)
- npm
- MongoDB Atlas account or MongoDB instance
- Redis server
- Google Gemini API key

### 1. Clone the Repository

```bash
git clone https://github.com/igautam21/knowledge-continuity-system.git
cd knowledge-continuity-system
```

### 2. Install Backend Dependencies

```bash
cd server
npm install
```

### 3. Configure Environment Variables

Create a `.env` file inside the `server` directory.

```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_secure_jwt_secret
GEMINI_API_KEY=your_gemini_api_key
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
```

Use your own credentials. Never commit the `.env` file.

### 4. Start Redis

If Docker is installed, you can run Redis using:

```bash
docker run -d --name knowledge-redis -p 6379:6379 redis:7-alpine
```

If the container already exists, start it with:

```bash
docker start knowledge-redis
```

### 5. Start the Backend

From the `server` directory:

```bash
npm start
```

The backend runs at:

```text
http://localhost:5000
```

### 6. Install and Start the Frontend

Open a new terminal:

```bash
cd client
npm install
npm run dev
```

The frontend runs at:

```text
http://localhost:5173
```

## API Endpoints

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

## Background Processing Workflow

1. An authenticated user submits a knowledge record.
2. The backend stores the record in MongoDB.
3. A summarization job is added to the BullMQ queue.
4. A background worker retrieves the job.
5. Gemini generates a summary and document embedding.
6. The worker saves the summary and embedding to MongoDB.
7. The record becomes available for semantic search and RAG-based question answering.

## Semantic Search and RAG

The system uses embedding vectors to represent knowledge records and user queries.

Semantic search calculates cosine similarity between query embeddings and stored knowledge embeddings to retrieve relevant records.

The RAG assistant then uses the retrieved knowledge as context to generate an answer and return supporting source records.

## Testing

The backend uses Jest and Supertest for automated testing.

Run the test suite from the `server` directory:

```bash
npm test
```

The project currently includes tests covering:

- API health checks
- User authentication
- Knowledge management
- RAG-based question answering
- Authentication middleware
- Rate-limiting behavior

## Security Considerations

- Passwords are hashed using bcrypt.
- JWT authentication protects private API routes.
- Environment variables are used for sensitive configuration.
- Rate limiting helps protect API endpoints from excessive requests.
- Knowledge retrieval is scoped to the authenticated user.
- AI responses use retrieved knowledge as their context.

## Future Improvements

- Persistent storage for conversation history.
- More advanced knowledge analytics and reporting.
- Role-based access control for organizational teams.
- Improved document ingestion and knowledge extraction.
- Production-ready deployment with centralized rate-limit storage.

## Author

**Gautam Yadav**

GitHub: [@igautam21](https://github.com/igautam21)

---

*Built as an AI Engineering project focused on organizational knowledge preservation and project continuity.*