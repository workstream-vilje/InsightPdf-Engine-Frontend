# RAG Canvas API Documentation

This document outlines the API endpoints required by the RAG Canvas frontend to support its functionalities, including document management, pipeline configuration, experimentation, and monitoring.

## Base URL
`https://api.rag-canvas.example.com/v1` (Placeholder)

---

## 1. Projects & Document Management

### 1.1 List Projects
Returns a list of all available projects.

- **URL:** `/projects`
- **Method:** `GET`
- **Response:**
  ```json
  [
    { "id": "proj-1", "name": "Legal Docs (Main)" },
    { "id": "proj-2", "name": "Research Workspace" }
  ]
  ```

### 1.2 Create Project
- **URL:** `/projects`
- **Method:** `POST`
- **Body:**
  ```json
  { "name": "Project Name" }
  ```
- **Response:** `{ "id": "proj-3", "name": "Project Name" }`

### 1.3 List Documents
- **URL:** `/projects/{projectId}/documents`
- **Method:** `GET`
- **Query Params:** `category` (optional)
- **Response:**
  ```json
  [
    {
      "id": "doc-1",
      "name": "annual_report_2024.pdf",
      "category": "Financial",
      "pages": 42,
      "size": "3.2 MB",
      "uploadDate": "2024-03-29T14:22:00Z"
    }
  ]
  ```

### 1.4 Upload Document
- **URL:** `/projects/{projectId}/documents/upload`
- **Method:** `POST`
- **Content-Type:** `multipart/form-data`
- **Body:**
  - `file`: PDF file
  - `category`: string (optional)
- **Response:**
  ```json
  {
    "id": "doc-new",
    "name": "filename.pdf",
    "category": "category",
    "pages": 54,
    "size": "2.4MB"
  }
  ```

### 1.5 Delete Document
- **URL:** `/documents/{documentId}`
- **Method:** `DELETE`

---

## 2. Pipeline Execution (Inference)

### 2.1 Run Pipeline
Executes a RAG query through a specified pipeline configuration.

- **URL:** `/pipeline/run`
- **Method:** `POST`
- **Body:**
  ```json
  {
    "projectId": "proj-1",
    "documentIds": ["doc-1"],
    "query": "What is the revenue growth for Q4 2024?",
    "config": {
      "textProcessing": {
        "strategy": "recursive", // recursive, semantic, token, fixed
        "chunkSize": 1000,
        "overlap": 200
      },
      "dataExtraction": {
        "engine": "pymupdf" // pymupdf, unstructured
      },
      "embedding": {
        "provider": "openai", // openai, ollama, anthropic
        "model": "text-embedding-3-small"
      },
      "llm": {
        "provider": "openai",
        "model": "gpt-4-turbo"
      },
      "vectorStore": {
        "provider": "ChromaDB" // PostgreSQL, ChromaDB, FAISS, Pinecone
      },
      "retrieval": {
        "strategy": "semantic", // semantic, hybrid, mmr
        "topK": 3
      },
      "routing": {
        "complexityThreshold": 50
      },
      "architecture": "Simple Retrieval", // Simple Retrieval, Meta → Sub Agent, Multi-Level Sub
      "options": {
        "redisCache": true,
        "langSmithTracing": false,
        "ragasEvaluation": true
      }
    }
  }
  ```
- **Response:**
  ```json
  {
    "runId": "H-240329-01",
    "answer": "Revenue grew 23.4% YoY in Q4 2024...",
    "retrievedChunks": [
      {
        "text": "Revenue grew 23.4% year-over-year in Q4 2024...",
        "page": 12,
        "score": 0.94
      }
    ],
    "metrics": {
      "execution": {
        "totalTime": "1.3s",
        "embedTime": "0.2s",
        "retrievalTime": "0.4s",
        "llmTime": "0.7s",
        "tokenCount": 2847,
        "estimatedCost": 0.014
      },
      "quality": {
        "faithfulness": 92,
        "contextPrecision": 88,
        "contextRecall": 85,
        "answerRelevance": 91
      }
    },
    "tracing": [
      { "step": "Document Loader", "time": "0.12s", "status": "success", "detail": "PDF: annual_report_24.pdf" },
      { "step": "Text Splitter", "time": "0.08s", "status": "success", "detail": "Strategy: Recursive" }
    ]
  }
  ```

---

## 3. Chunking Experiments

### 3.1 Run Chunking Experiment
Runs multiple chunking strategies on a document to compare results.

- **URL:** `/experiments/chunking`
- **Method:** `POST`
- **Body:**
  ```json
  {
    "documentId": "doc-1",
    "strategies": [
      {
        "id": "recursive",
        "config": { "chunkSize": 1000, "overlap": 200 }
      },
      {
        "id": "semantic",
        "config": { "chunkSize": 1000, "overlap": 200 }
      }
    ]
  }
  ```
- **Response:**
  ```json
  {
    "results": {
      "recursive": {
        "chunks": [
          { "id": 1, "text": "...", "tokens": 42, "chars": 256 }
        ],
        "stats": {
          "count": 45,
          "avgTokens": 180,
          "avgChars": 950,
          "latency": 0.35
        }
      },
      "semantic": {
        "chunks": [...],
        "stats": { "count": 38, "avgTokens": 210, "avgChars": 1100, "latency": 0.25 }
      }
    }
  }
  ```

---

## 4. Profiles (Saved Configurations)

### 4.1 List Profiles
- **URL:** `/profiles`
- **Method:** `GET`
- **Response:**
  ```json
  [
    {
      "id": "prof-1",
      "name": "Research Papers Optimized",
      "tags": ["recursive", "semantic"],
      "config": { ...pipelineConfig... },
      "createdAt": "2024-12-15"
    }
  ]
  ```

### 4.2 Save Profile
- **URL:** `/profiles`
- **Method:** `POST`
- **Body:**
  ```json
  {
    "name": "My New Profile",
    "config": { ...pipelineConfig... }
  }
  ```

### 4.3 Delete Profile
- **URL:** `/profiles/{profileId}`
- **Method:** `DELETE`

---

## 5. History & Analytics

### 5.1 Get Run History
- **URL:** `/history`
- **Method:** `GET`
- **Response:**
  ```json
  [
    {
      "id": "H-240329-01",
      "date": "2024-03-29 14:22",
      "config": {
        "llm": "GPT-4o",
        "embedding": "OpenAI v3-Small",
        "db": "PGVector (v0.5)",
        "retrieval": "Semantic Rerank"
      },
      "metrics": {
        "accuracy": 94.2,
        "latency": "1.2s",
        "cost": "$0.012",
        "relevance": 91
      },
      "status": "Verified",
      "isBest": true
    }
  ]
  ```

### 5.2 Get Comparison Analytics
Provides data for charts (e.g., Response Time vs DB, Chunk Size vs Accuracy).

- **URL:** `/analytics/comparison`
- **Method:** `GET`
- **Response:**
  ```json
  {
    "responseTimeVsDb": [
      { "name": "PGVector", "time": 1.3, "accuracy": 92 },
      { "name": "FAISS", "time": 0.8, "accuracy": 88 }
    ],
    "chunkSizeVsAccuracy": [
      { "size": 256, "recursive": 65, "semantic": 72 },
      { "size": 1000, "recursive": 82, "semantic": 92 }
    ]
  }
  ```
