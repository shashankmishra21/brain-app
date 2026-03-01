# BrainCache — Knowledge Management Platform

> A production-grade backend for capturing, organizing, and retrieving your second brain.

![Node.js](https://img.shields.io/badge/Node.js-20+-green)
![TypeScript](https://img.shields.io/badge/TypeScript-Strict-blue)
![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-green)
![Redis](https://img.shields.io/badge/Redis-Cache-red)
![License](https://img.shields.io/badge/license-MIT-blue)

---

## Features

- **JWT Authentication** — Secure signup/signin with bcrypt password hashing
- **Content Management** — Save links, documents, and notes across 7 content types
- **Full-text Search** — MongoDB text indexes with relevance scoring
- **Redis Caching** — 8x faster repeated queries (40ms → 5ms)
- **File Uploads** — PDF, DOC, DOCX, PPT via Multer (10MB limit)
- **Brain Share** — Public shareable link for your knowledge base
- **Security** — Helmet, rate limiting, XSS + NoSQL injection protection
- **Pagination** — Efficient retrieval with compound indexes
- **Centralized Error Handling** — AppError class, Zod, JWT, Mongoose errors

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 20+ |
| Framework | Express.js + TypeScript |
| Database | MongoDB + Mongoose |
| Cache | Redis (ioredis) |
| Auth | JWT + bcrypt |
| Validation | Zod |
| File Upload | Multer |
| Security | Helmet, rate-limiter-flexible, xss, express-mongo-sanitize |
| Queue (upcoming) | BullMQ + Redis |
| AI (upcoming) | OpenAI + Pinecone |

---

## Project Structure

```
src/
├── app.ts                        # Express setup + middleware
├── server.ts                     # Entry point
├── config/
│   ├── database.ts               # MongoDB connection
│   └── redis.ts                  # Redis connection
├── features/
│   ├── auth/
│   │   └── auth.routes.ts        # signup, signin
│   ├── content/
│   │   ├── content.model.ts      # Schema + indexes
│   │   └── content.routes.ts     # CRUD + search + download
│   └── brain/
│       └── brain.routes.ts       # Share link
├── middleware/
│   ├── auth.middleware.ts        # JWT verification
│   ├── cache.middleware.ts       # Redis cache + invalidation
│   ├── error.middleware.ts       # Centralized error handler
│   └── rate-limit.middleware.ts  # API + auth rate limiting
└── types/
    └── index.ts                  # Shared TS interfaces
```

---

## API Endpoints

### Auth
```
POST   /api/v1/signup              Register new user
POST   /api/v1/signin              Login, returns JWT
```

### Content
```
POST   /api/v1/content               Create content (with file upload)
GET    /api/v1/content               Get all content (paginated)
GET    /api/v1/content/search        Full-text search with relevance
DELETE /api/v1/content               Delete content + file cleanup
GET    /api/v1/content/:id/download  Download document
```

### Brain Share
```
POST   /api/v1/brain/share         Enable/disable public share link
GET    /api/v1/brain/:hash         View shared brain (public)
```

---

## Setup & Installation

### Prerequisites
- Node.js 20+
- MongoDB
- Redis (`docker run -d -p 6379:6379 redis`)

### Steps

```bash
# 1. Clone repo
git clone https://github.com/yourusername/braincache-backend
cd braincache-backend

# 2. Install dependencies
npm install

# 3. Setup environment
cp .env.example .env
DATABASE_URL=database-url
PORT=3000
REDIS_URL="redis_url"

# 4. Run dev server
npm run dev
```

---

## Environment Variables

```env
PORT=3000
DATABASE_URL=mongodb://localhost:27017/braincache
JWT_SECRET=your-super-secret-key
BACKEND_URL=http://localhost:3000
REDIS_HOST=localhost
REDIS_PORT=6379
```

---

## Performance

| Metric | Value |
|--------|-------|
| Cache HIT response | ~5ms |
| Cache MISS response | ~40ms |
| Cache improvement | 8x faster |
| Rate limit (API) | 100 req/min |
| Rate limit (Auth) | 5 attempts/15min |
| Max file size | 10MB |
| Pagination default | 20 items/page |

---

## Security Features

- JWT authentication on all protected routes
- bcrypt password hashing (salt rounds: 10)
- Helmet.js — OWASP security headers
- Rate limiting — brute force protection
- express-mongo-sanitize — NoSQL injection prevention
- xss — XSS attack sanitization
- File type validation (PDF, DOC, DOCX, PPT only)
- Projection — sensitive fields excluded from responses

---

## Author

**Shashank Mishra**  
Full Stack Developer | Backend Specialist  
[GitHub](https://github.com/shashankmishra21) • [LinkedIn](https://www.linkedin.com/in/mishrashashank2106)
