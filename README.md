# 🔥 SIM API (Cat-Bot Core Intelligence)

SIM API is a custom AI backend designed for chat systems such as Discord bots, web apps, and messaging platforms.

It features persistent memory, configurable AI personality (SIM mode), and a scalable architecture built for production deployment.

---

## 🚀 Key Features

- 💬 AI Chat API (`/api/chat`)
- ❤️ Persistent Memory (PostgreSQL)
- 🧠 Short-term + Long-term memory system
- ⚙️ Thread-based conversation tracking
- 🔥 SIM Personality Control:
  - sim on
  - sim off
  - sim model <name>
- 📊 Health & Uptime Monitoring (`/api/health`)
- ⚡ Fast response via in-memory caching
- 🐳 Docker support for deployment
- ☁️ Cloud-ready (Render, Railway, Fly.io)

---

## 📡 API Endpoints

### 🔹 Chat Endpoint

POST /api/chat

Request:
{
  "message": "Hello SIM",
  "threadId": "123",
  "model": "native"
}

Response:
{
  "response": "Hello! How can I help you?"
}

---

### 🔹 Health Check

GET /api/health

Response:
{
  "status": "ok",
  "uptime": 12345,
  "timestamp": "2026-06-13T00:00:00.000Z"
}

---

## 🧠 Memory System

SIM API uses a dual-layer memory architecture:

### 📌 Short-Term Memory
- Stored in: st_{threadId}
- Tracks recent conversation context
- Used for immediate chat continuity

### 📌 Long-Term Memory
- Stored in: lt_{threadId}
- Extracted user facts and important information
- Survives restarts and deployments

### 📌 Knowledge Base
- File: knowledge/base.json
- Static AI reference data

---

## ⚙️ SIM Command System

sim on        → Enable AI responses  
sim off       → Disable AI responses  
sim model x   → Switch AI model  
sim <message> → Talk to SIM AI  

---

## 🏗️ System Architecture

User  
→ Client (Discord / App)  
→ SIM Command Layer (sim.ts)  
→ API Server (/api/chat)  
→ Memory Layer (PostgreSQL + Cache)  
→ AI Engine  
→ Response  

---

## 🗄️ Database Schema (PostgreSQL)

CREATE TABLE thread_settings (
  user_id TEXT,
  session_id TEXT,
  thread_id TEXT,
  is_on BOOLEAN DEFAULT false,
  model TEXT DEFAULT 'native',
  updated_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (user_id, session_id, thread_id)
);

---

## ⚙️ Environment Variables

DATABASE_URL=your_postgres_connection_string  
PORT=3000  

---

## 🐳 Docker Deployment

docker build -t sim-api .  
docker run -p 3000:3000 sim-api  

---

## 🚀 Deployment

Recommended:
- Render
- Railway
- Fly.io

Render Setup:
- Environment: Docker
- Port: 3000

---

## 📊 Monitoring

GET /api/health

Used for:
- UptimeRobot
- server monitoring
- status checks

---

## 🔥 Performance Design

- In-memory cache (Map)
- PostgreSQL persistent storage
- Write-through caching
- Lazy loading after restart

---

## ⚠️ Notes

- Cache resets on restart (normal)
- PostgreSQL = source of truth
- Docker optional but supported

---

## 👨‍💻 Author

ZTOURX
