# ExamSathi — AI-Powered Exam Prep SaaS

AI-powered competitive exam preparation platform for Indian students targeting NEET, JEE, UPSC, CAT, and SSC. Built with Angular 17, Node.js/Express, MongoDB, and Claude AI.

---

## Tech Stack

| Layer    | Technology |
|----------|------------|
| Frontend | Angular 17 (standalone, signals, OnPush) + Tailwind CSS |
| Backend  | Node.js + Express (ES Modules) |
| Database | MongoDB + Mongoose |
| AI       | Anthropic Claude (claude-sonnet-4) |
| Payments | Razorpay |
| Auth     | JWT (access + refresh tokens) |
| Deploy   | Vercel (client) + Railway (server) |

---

## Project Structure

```
examsathi/
├── client/          # Angular 17 frontend
│   ├── src/app/
│   │   ├── core/         # Guards, interceptors, services, models
│   │   ├── features/     # Feature modules (dashboard, test-engine, roadmap…)
│   │   ├── layouts/      # Main layout, auth layout
│   │   └── shared/       # Reusable components, constants
│   ├── vercel.json       # Vercel SPA routing config
│   └── ngsw-config.json  # PWA service worker config
│
└── server/          # Express API
    ├── src/
    │   ├── config/       # Environment config
    │   ├── controllers/  # Route handlers
    │   ├── middleware/    # Auth, error, rate limiting
    │   ├── models/       # Mongoose schemas
    │   ├── routes/       # Express routers
    │   ├── services/     # Claude AI, email
    │   ├── utils/        # Logger, helpers
    │   └── seed.js       # Database seeder
    ├── railway.json      # Railway deployment config
    └── Procfile          # Process file
```

---

## Quick Start

### Prerequisites

- Node.js ≥ 20
- MongoDB (local or Atlas)
- Anthropic API key
- Razorpay account (for payments)

### 1. Clone & Install

```bash
git clone https://github.com/your-org/examsathi.git
cd examsathi

# Install server dependencies
cd server && npm install

# Install client dependencies
cd ../client && npm install
```

### 2. Configure Environment

```bash
# Server
cp server/.env.example server/.env
# Edit server/.env with your values

# Client — update API URL if needed
# client/src/environments/environment.ts
```

### 3. Seed Database (optional)

```bash
cd server
node src/seed.js
```

This creates 3 test accounts and sample questions for NEET, JEE, UPSC.

**Test Credentials:**
| Email | Password | Plan |
|-------|----------|------|
| student@examsathi.in | Test@1234 | Free / NEET |
| pro@examsathi.in | Test@1234 | Pro / JEE |
| admin@examsathi.in | Test@1234 | Admin / UPSC |

### 4. Run Development Servers

```bash
# Terminal 1 — API server (http://localhost:5000)
cd server && npm run dev

# Terminal 2 — Angular dev server (http://localhost:4200)
cd client && npm start
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register user |
| POST | `/api/auth/login` | Login |
| GET  | `/api/auth/me` | Get current user |
| PUT  | `/api/auth/profile` | Update profile |
| GET  | `/api/questions` | List questions |
| POST | `/api/questions/generate` | AI generate questions |
| POST | `/api/tests/start` | Start test session |
| POST | `/api/tests/:id/submit` | Submit answer |
| POST | `/api/tests/:id/finish` | Finish test |
| GET  | `/api/tests/history` | Test history |
| GET  | `/api/dashboard` | Dashboard data |
| POST | `/api/roadmap/generate` | AI generate roadmap |
| GET  | `/api/roadmap` | Get current roadmap |
| PUT  | `/api/roadmap/topic/:id` | Update topic status |
| POST | `/api/roadmap/regenerate` | Regenerate roadmap |

---

## Deployment

### Client → Vercel

1. Connect your GitHub repo to Vercel
2. Set **Root Directory** to `client`
3. Set **Build Command** to `npm run build:prod`
4. Set **Output Directory** to `dist/examsathi/browser`
5. Add environment variable: `CLIENT_URL` (your Vercel URL)

### Server → Railway

1. Connect your GitHub repo to Railway
2. Set **Root Directory** to `server`
3. Add all environment variables from `.env.example`
4. Railway auto-detects `railway.json` and `Procfile`

---

## Environment Variables

See `server/.env.example` for all required variables.

**Required for production:**
- `MONGODB_URI` — MongoDB Atlas connection string
- `JWT_SECRET` — min 32 chars, cryptographically random
- `JWT_REFRESH_SECRET` — different from JWT_SECRET
- `ANTHROPIC_API_KEY` — from console.anthropic.com
- `CLIENT_URL` — deployed frontend URL (for CORS)

---

## Features

- **AI Question Generation** — Claude generates MCQs per exam/subject/topic
- **Adaptive Test Engine** — timed tests with question grid + live answer submission
- **Smart Dashboard** — aggregated stats, weak areas, spaced repetition queue
- **AI Study Roadmap** — personalised week-by-week plan until exam date
- **Weak Area Tracking** — SRS-based review scheduling (critical/moderate/good)
- **Hindi Language Support** — UI toggle for regional language
- **PWA** — installable on Android/iOS with offline shell caching

---

## License

MIT
