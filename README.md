# Distributed Email Scheduler & Campaign Dispatcher

A production-grade, full-stack email scheduling and dispatching application built for high-throughput background processing, atomic hourly rate-limiting per sender, real Google & Slack OAuth integrations, BullMQ delayed job processing, Elasticsearch search indexing, and real-time dashboard monitoring.

---

## Architecture Diagram

```
+-----------------------------------------------------------------------------------+
|                                  React + Vite Frontend                            |
|                 (Login, Dashboard, Compose Modal, Tables, Live Polling)           |
+-----------------------------------------------------------------------------------+
                                         |
                                         | REST HTTP / Axios
                                         v
+-----------------------------------------------------------------------------------+
|                                Node.js + Express Backend                          |
|    - Google & Slack OAuth Controllers                                            |
|    - Email Scheduling & Parsing Engine                                           |
|    - Bull Board Monitoring (/admin/queues)                                        |
|    - Elasticsearch Multi-Match Search API                                        |
+-----------------------------------------------------------------------------------+
          |                               |                             |
          | Prisma ORM                    | BullMQ Job Add              | Search Indexing
          v                               v                             v
+-------------------+           +-------------------+         +-------------------+
|  PostgreSQL DB    |           |   Redis Queue     |         |  Elasticsearch    |
| (User, Sender,    |           | (emailQueue &     |         |  (email_jobs      |
|  EmailJob,        |           |  Atomic Hourly    |         |   full-text       |
|  SlackConnection) |           |  Rate Counters)   |         |   search index)   |
+-------------------+           +-------------------+         +-------------------+
                                          |
                                          | BullMQ Worker Pool (Concurrency=5)
                                          v
                         +-----------------------------------+
                         |         BullMQ Email Worker       |
                         |  1. Pre-send Idempotency Check    |
                         |  2. Atomic Redis Rate Limit Check |
                         |  3. Reschedule if Limit Reached   |
                         |  4. Slack Deduplicated Alert      |
                         |  5. Nodemailer Ethereal SMTP      |
                         +-----------------------------------+
```

---

## Tech Stack

### Backend
- **Node.js** & **TypeScript**
- **Express.js** web application server
- **PostgreSQL** database & **Prisma ORM** schema management
- **Redis 7** & **BullMQ** delayed queue architecture
- **Nodemailer** with **Ethereal Email** SMTP service
- **Elasticsearch 8** for distributed full-text job search
- **Google OAuth 2.0** & **Slack OAuth 2.0**
- **Bull Board** for live visual queue monitoring

### Frontend
- **React 18** + **Vite** + **TypeScript**
- **Tailwind CSS** modern dark glassmorphism design
- **React Router DOM v6**
- **Axios** HTTP client with credentials support
- **Lucide Icons**

### Infrastructure
- **Docker Compose** orchestrating PostgreSQL, Redis, and Elasticsearch

---

## Folder Structure

```
email-scheduler/
├── docker-compose.yml          # PostgreSQL, Redis, Elasticsearch orchestration
├── .env.example                # Template for environment variables
├── .env                        # Active local environment variables
├── README.md                   # Full system documentation
├── backend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── prisma/
│   │   └── schema.prisma       # Database models & relationships
│   └── src/
│       ├── config/             # Passport, Prisma, Redis, Bull Board setup
│       ├── controllers/        # Express request handlers
│       ├── services/           # Core business logic & integrations
│       ├── repositories/       # Prisma database persistence abstraction
│       ├── middleware/          # Auth guards & centralized error handler
│       ├── queues/             # BullMQ queue declaration
│       ├── workers/            # BullMQ parallel job execution worker
│       ├── routes/             # REST routing endpoints
│       ├── types/              # TypeScript interface definitions
│       ├── utils/              # Custom AppError class
│       ├── app.ts              # Express application setup
│       └── index.ts            # Application bootstrap entrypoint
└── frontend/
    ├── package.json
    ├── tsconfig.json
    ├── vite.config.ts
    ├── tailwind.config.js
    ├── index.html
    └── src/
        ├── components/         # Header, ComposeModal, ScheduledTable, SentTable, StatusBadge
        ├── context/            # AuthContext provider
        ├── pages/              # Login, Dashboard
        ├── services/           # Axios API services
        ├── types/              # Frontend TypeScript definitions
        ├── App.tsx             # Router setup
        └── main.tsx            # React DOM root entrypoint
```

---

## Environment Variable Setup

Copy `.env.example` to `.env` in the root folder:

```bash
# Database Configuration
DATABASE_URL="postgresql://postgres:postgrespassword@localhost:5432/email_scheduler?schema=public"

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379

# Elasticsearch Configuration
ELASTICSEARCH_NODE=http://localhost:9200

# Worker and Queue Rules
WORKER_CONCURRENCY=5
MIN_DELAY_BETWEEN_EMAILS=2000
MAX_EMAILS_PER_HOUR_PER_SENDER=200

# Server Port
PORT=5000
BACKEND_URL=http://localhost:5000
FRONTEND_URL=http://localhost:5173

# Authentication Secrets & OAuth
SESSION_SECRET=email_scheduler_super_secret_session_key_2026

GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:5000/auth/google/callback

SLACK_CLIENT_ID=your_slack_client_id
SLACK_CLIENT_SECRET=your_slack_client_secret
SLACK_REDIRECT_URI=http://localhost:5000/api/slack/callback

# Nodemailer / Ethereal Email Configuration
ETHEREAL_HOST=smtp.ethereal.email
ETHEREAL_PORT=587
ETHEREAL_USER=
ETHEREAL_PASS=
```

---

## How to Run the Application

### Step 1: Start Infrastructure (PostgreSQL, Redis, Elasticsearch)

Run Docker Compose to spin up database and caching services:

```bash
docker compose up -d
```

Verify container status:
```bash
docker compose ps
```

### Step 2: Database Migration

Navigate to `backend` directory and run Prisma migrations:

```bash
cd backend
npx prisma migrate dev --name init
```

### Step 3: Run Backend & Worker

Start backend server and BullMQ worker:

```bash
cd backend
npm run dev
```

The backend server will start on `http://localhost:5000`.

### Step 4: Run Frontend

In a separate terminal, start the React Vite dev server:

```bash
cd frontend
npm run dev
```

Open your browser at `http://localhost:5173`.

---

## Core Technical Concepts & Implementation

### 1. Google OAuth Authentication
- Integrated using Passport.js (`passport-google-oauth20`) and Express sessions.
- Users authenticate via Google, creating/updating a `User` record in PostgreSQL.
- Sessions are maintained with HTTP-only cookies.
- For instant testing without developer console client keys, `/auth/dev-login` provides developer session creation.

### 2. Slack OAuth & Rate-Limit Alerts
- Users connect their Slack workspace via `/api/slack/connect`.
- OAuth token is stored in the `SlackConnection` model.
- When a sender reaches the hourly limit (`MAX_EMAILS_PER_HOUR_PER_SENDER`), a Slack alert is posted to the team workspace.
- **Redis Deduplication**: To avoid spamming Slack on every rate-limited job, a Redis key `slack_notif:{senderId}:{YYYY-MM-DD-HH}` with a 1-hour TTL ensures exactly **one Slack message per sender per hour window**.

### 3. BullMQ Scheduling & Restart Persistence
- Email jobs are assigned a initial delay calculated as `scheduledAt - Date.now()`.
- Future jobs survive server/worker restarts because job data is persisted in Redis by BullMQ and email records are stored in PostgreSQL.
- Restarting Express or worker processes does not drop or re-send emails.

### 4. Idempotency & Duplicate Prevention
- **Database level**: Unique constraint on `idempotencyKey` in PostgreSQL.
- **Queue level**: Deterministic BullMQ job IDs (`job_<idempotencyKey>`).
- **Worker level**: Pre-execution guard checks `status === 'sent'` or `sentAt !== null` before calling Nodemailer.

### 5. Worker Concurrency (`WORKER_CONCURRENCY=5`)
- BullMQ worker executes multiple job callbacks concurrently up to `WORKER_CONCURRENCY`.
- Shared atomic checks in Redis prevent race conditions across parallel workers.

### 6. Minimum Delay (`MIN_DELAY_BETWEEN_EMAILS=2000`)
- When bulk scheduling recipient emails (via CSV or form), each recipient's `scheduledAt` timestamp is incrementally calculated:
  `scheduledAt[i] = baseStartTime + (i * MIN_DELAY_BETWEEN_EMAILS)`
- This guarantees sequential gap timing between individual recipient dispatches.

### 7. Atomic Hourly Rate Limiting
- Key format: `email_rate:{senderId}:{YYYY-MM-DD-HH}` in Redis.
- Uses a Redis Lua script (`INCR` + `EXPIRE`) to atomically track current hour quota across any number of worker instances.
- If limit exceeded:
  - Job is **not dropped** and **not failed**.
  - Delay to the next hour window (`00:00:00` UTC) is calculated.
  - Job is rescheduled in BullMQ with `{ delay: nextWindowDelayMs }`.
  - Database status is set to `rate_limited`.

### 8. Elasticsearch Indexing & Search
- All job status changes (`created`, `processing`, `rate_limited`, `sent`, `failed`) are indexed into the `email_jobs` Elasticsearch index.
- `GET /api/emails/search?q=` executes multi-match full-text searches over recipient emails, subjects, bodies, and statuses.
- Fallback: If Elasticsearch is unreachable, queries automatically fall back to PostgreSQL database search.

---

## Server Restart Testing Instructions

1. Schedule 10 emails with a 10-second initial delay.
2. Verify jobs appear as `scheduled` in the dashboard and in Bull Board (`/admin/queues`).
3. Stop the backend server (`Ctrl + C`).
4. Wait 15 seconds.
5. Restart the backend server (`npm run dev`).
6. Observe logs: BullMQ worker immediately picks up the due jobs from Redis, sends them via Nodemailer, and marks them `sent` without duplicate processing.

---

## Assumptions & Tradeoffs

- **Session Store**: In local development, MemoryStore is used for session management; in high-availability production, Redis Store (`connect-redis`) is connected.
- **Ethereal Email**: Real Ethereal SMTP is used. If `ETHEREAL_USER` and `ETHEREAL_PASS` are omitted in `.env`, Nodemailer dynamically generates an Ethereal test account on startup for convenience.
- **Elasticsearch**: Single-node Elasticsearch instance runs locally with security features disabled (`xpack.security.enabled=false`) to streamline local development without SSL setup overhead.
