# 🧠 BrainCache - AI Knowledge Engine

> Scalable backend powering an AI-driven personal knowledge engine with hybrid search and contextual AI answers.
> This repository contains the backend services powering BrainCache.

![Node.js](https://img.shields.io/badge/Node.js-20+-green)
![TypeScript](https://img.shields.io/badge/TypeScript-Strict-blue)
![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-green)
![Redis](https://img.shields.io/badge/Redis-Cache-red)
![License](https://img.shields.io/badge/license-MIT-blue)

---

## 🚀 Overview

BrainCache Backend is a **production-grade AI-powered knowledge engine** designed to capture, process, and retrieve user data intelligently.

It implements a **Retrieval-Augmented Generation (RAG)-style pipeline**, combining:
- Keyword search (MongoDB)
- Semantic search (vector embeddings)
- LLM-based answer generation

---

## ✨ Core Capabilities

### 🧠 Intelligent Knowledge Retrieval
- Natural language querying over user data
- AI-generated contextual answers
- Personalized responses using stored knowledge

### 📥 Universal Content Ingestion
- Supports:
  - Notes
  - Links
  - Documents
  - Social content
- File uploads with validation (PDF, DOC, PPT, etc)

### 🔎 Hybrid Search Engine
- MongoDB full-text search (text index)
- Semantic search via embeddings
- Merged ranking for better relevance

### 🤖 AI Answer Generation
- Uses Groq (LLaMA 3.1)
- Context built from top retrieved results
- Returns concise answers (2–3 lines)

### ⚡ High Performance
- Redis caching for content APIs
- Pagination + indexing
- Optimized queries

### 🔄 Async AI Processing
- BullMQ queue for:
  - Embedding generation
  - Summarization
  - Auto-tagging

---

## 🖥️ Tech Stack

| Layer | Technology |
|------|-----------|
| Runtime | Node.js |
| Language | TypeScript |
| Framework | Express.js |
| Database | MongoDB |
| Cache | Redis |
| Queue | BullMQ |
| Vector DB | Pinecone |
| LLM | Groq (LLaMA 3.1) |
| Embeddings | HuggingFace |
| Auth | JWT + bcrypt |
| Validation | Zod |
| File Upload | Multer |
| Security | Helmet, rate limiting, XSS, NoSQL sanitization |

---

## 📂 Project Structure

src/
├── config/
├── features/
│   ├── auth/
│   ├── brain/
│   └── content/
├── middleware/
├── queues/
│   └── ai.queue.ts
├── services/
│   └── ai.service.ts
├── types/
├── app.ts
├── server.ts

---

## 📡 API Endpoints

### Auth
POST   /api/v1/signup  
POST   /api/v1/signin  

---

### Content

POST   /api/v1/content  
→ Create content (supports file upload)

GET    /api/v1/content  
→ Get all content (pagination + filtering + caching)

GET    /api/v1/content/search?q=query&type=&page=&limit=  
→ Hybrid search (keyword + semantic)  
→ Returns AI-generated answer + results

GET    /api/v1/content/:id  
→ Get single content with metadata

GET    /api/v1/content/:id/download  
→ Download document file

PUT    /api/v1/content/:id  
→ Update content (re-triggers AI processing)

DELETE /api/v1/content  
→ Delete content + file + vector embeddings

---

### Brain Share

POST   /api/v1/brain/share  
GET    /api/v1/brain/:hash  

---

## 🤖 AI Flow (Important)

1. User creates content  
2. Content stored in MongoDB  
3. Job added to BullMQ queue  
4. AI service:
   - Generates embeddings  
   - Creates summary + tags  
   - Stores vector in Pinecone  

5. On search:
   - MongoDB text search → keyword results  
   - Pinecone → semantic matches  
   - Merge both results  
   - Top results → sent to LLM  
   - LLM generates final answer  

---

## ⚙️ Setup & Installation

1. Clone the repository  
git clone https://github.com/shashankmishra21/braincache-backend  
cd braincache-backend  

2. Install dependencies  
npm install  

3. Create `.env` file  

PORT=3000  
DATABASE_URL=your_mongodb_url  
REDIS_URL=your_redis_url  

PINECONE_API_KEY=your_key  
PINECONE_INDEX=your_index  

GROQ_API_KEY=your_key  
HUGGINGFACE_TOKEN=your_token  

4. Run server  
npm run dev  

---

## 📊 Performance

- Redis caching → faster repeated queries  
- Hybrid search → better accuracy  
- Async jobs → non-blocking API  
- Indexed queries → scalable performance  

---

## 🔐 Security Features

- JWT authentication  
- bcrypt password hashing  
- Rate limiting  
- Helmet security headers  
- XSS protection  
- NoSQL injection protection  
- File validation + size limits  

---

## 🎯 Design Principles

- Modular architecture  
- Separation of concerns  
- AI-first backend design  
- Scalable and production-ready system  

---

## 👨‍💻 Author

Shashank Mishra  
Portfolio: http://shashankmishra.tech
GitHub: https://github.com/shashankmishra21  
LinkedIn: https://www.linkedin.com/in/mishrashashank2106  

---

## ⭐ Support

If you like this project, give it a star on GitHub.