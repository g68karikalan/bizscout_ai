# BizScout AI 🔭

> **Find local businesses that actually need your service.**

BizScout AI is a production-ready full-stack web application for AI-assisted local business lead generation and lightweight CRM. Designed for freelancers, agencies, designers, developers, and marketers who sell services to local businesses.

---

## Table of Contents

1. [Product Overview](#product-overview)
2. [Architecture](#architecture)
3. [Tech Stack](#tech-stack)
4. [Folder Structure](#folder-structure)
5. [Prerequisites](#prerequisites)
6. [Setup Instructions](#setup-instructions)
7. [Environment Variables](#environment-variables)
8. [Supabase Configuration](#supabase-configuration)
9. [Database Migrations](#database-migrations)
10. [Google Places Setup](#google-places-setup)
11. [Groq AI Setup](#groq-ai-setup)
12. [Hunter.io Setup (Optional)](#hunterio-setup-optional)
13. [Running Locally](#running-locally)
14. [Mock Mode](#mock-mode)
15. [Testing](#testing)
16. [Deployment](#deployment)
17. [Security Notes](#security-notes)
18. [Known Limitations](#known-limitations)
19. [V2 Improvements](#v2-improvements)

---

## Product Overview

BizScout AI lets you:

- **Search** local businesses by location, category, and lead count
- **Enrich** businesses with public contact info (email, phone, social links) via website scraping
- **Score** leads with deterministic rules based on your service type (social media design, web dev, SEO, etc.)
- **Analyze** opportunities with AI (Groq/LLM-powered summaries)
- **Generate** personalized outreach messages (WhatsApp, Instagram DM, Email, Call Script)
- **Manage** leads in a lightweight CRM with status tracking
- **Campaign** management to organize outreach efforts
- **Export** data as CSV or Excel
- **Visualize** analytics with charts and funnel views

---

## Architecture

```
Frontend (React + Vite + TypeScript + Tailwind)
  ↓ axios / React Query
Backend (Fastify + Node.js + TypeScript)
  ↓ Provider Abstractions
External: Google Places · Groq AI · Hunter.io
  ↓
Supabase (PostgreSQL + Auth + RLS)
```

### Key Design Decisions

1. **Provider Abstractions** — All external services use interfaces. Swap providers without touching page code.
2. **Deterministic Scoring First** — Lead scores are calculated with explicit rules, not AI guesses. AI only adds human-readable explanations.
3. **Mock Mode** — Full application functionality without any external API keys for development.
4. **Search Jobs** — Lead searches are async jobs with polling. One failed enrichment doesn't stop others.
5. **Soft Deletes** — Leads are archived, not destroyed.
6. **RLS** — Row Level Security on all Supabase tables prevents cross-user data access.

---

## Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| React 18 | UI framework |
| Vite 8 | Build tooling |
| TypeScript (strict) | Type safety |
| Tailwind CSS 3 | Utility-first styling |
| React Router v7 | Client-side routing |
| TanStack Query v5 | Server state management |
| Zustand v5 | Client state management |
| React Hook Form v7 | Form handling |
| Zod v4 | Schema validation |
| Lucide React | Icons |
| Recharts | Charts |
| Axios | HTTP client |

### Backend
| Technology | Purpose |
|---|---|
| Node.js | Runtime |
| Fastify | HTTP framework |
| TypeScript | Type safety |
| Zod | Schema validation |
| Axios | HTTP client for enrichment |
| Cheerio | HTML parsing for enrichment |
| Groq SDK | AI inference |

### Infrastructure
| Service | Purpose |
|---|---|
| Supabase | PostgreSQL + Auth + RLS |
| Vercel | Frontend hosting |
| Render / Railway | Backend hosting |

---

## Prerequisites

- Node.js 18+ (LTS recommended)
- npm 9+
- A Supabase project (free tier works)
- Optional: Google Places API key, Groq API key, Hunter.io API key

---

## Setup Instructions

### 1. Clone and install

```bash
# Install frontend dependencies
cd frontend
npm install

# Install backend dependencies
cd ../backend
npm install
```

### 2. Configure environment variables

```bash
# Frontend
cp frontend/.env.example frontend/.env

# Backend
cp backend/.env.example backend/.env
```

Edit both `.env` files with your values.

### 3. Start development servers

```bash
# Terminal 1 — Backend (http://localhost:3001)
cd backend && npm run dev

# Terminal 2 — Frontend (http://localhost:5173)
cd frontend && npm run dev
```

---

## Environment Variables

### Frontend (`frontend/.env`)

| Variable | Required | Description |
|---|---|---|
| `VITE_API_URL` | Yes | Backend URL (e.g., `http://localhost:3001`) |
| `VITE_SUPABASE_URL` | Production only | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Production only | Supabase anon/public key |

### Backend (`backend/.env`)

| Variable | Required | Description |
|---|---|---|
| `PORT` | Yes | Server port (default: `3001`) |
| `NODE_ENV` | Yes | `development` or `production` |
| `MOCK_DATA_MODE` | Yes | `true` = no external APIs needed |
| `SUPABASE_URL` | Production | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Production | Service role key (secret!) |
| `GOOGLE_PLACES_API_KEY` | Real search | Google Places API key |
| `GROQ_API_KEY` | AI features | Groq API key |
| `HUNTER_API_KEY` | Optional | Hunter.io for email enrichment |
| `CORS_ORIGIN` | Yes | Frontend URL for CORS |

---

## Supabase Configuration

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Go to **Settings → API** and copy:
   - Project URL → `SUPABASE_URL`
   - `anon` key → `VITE_SUPABASE_ANON_KEY` (frontend)
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (backend only)
3. Go to **Settings → Database** and copy the connection string → `DATABASE_URL`
4. In **Authentication → Settings**, enable "Email" sign-in

---

## Database Migrations

1. Open Supabase project → **SQL Editor → New query**
2. Paste contents of `database/migrations/001_initial_schema.sql`
3. Click **Run**

> This creates all tables, indexes, RLS policies, and triggers.

---

## Google Places Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Enable **Places API (New)**
3. Create an API key under **Credentials**
4. Restrict key to Places API + your server IP
5. Set `GOOGLE_PLACES_API_KEY` in `backend/.env`
6. Set `MOCK_DATA_MODE=false`

---

## Groq AI Setup

1. Sign up at [console.groq.com](https://console.groq.com)
2. Create an API key
3. Set `GROQ_API_KEY` in `backend/.env`

Without a Groq key, AI features fall back gracefully to template-based messages.

---

## Hunter.io Setup (Optional)

1. Sign up at [hunter.io](https://hunter.io)
2. Copy your API key
3. Set `HUNTER_API_KEY` in `backend/.env`

If not set, only website scraping is used for email discovery.

---

## Running Locally

```bash
# Check backend health
curl http://localhost:3001/health
# {"status":"ok","mode":"mock","timestamp":"..."}

# Frontend available at
http://localhost:5173
```

### Available commands

```bash
# Frontend
npm run dev          # Start dev server
npm run build        # Production build
npm run typecheck    # TypeScript check
npm run test         # Run unit tests

# Backend
npm run dev          # Start with hot reload
npm run build        # Compile TypeScript
npm run typecheck    # TypeScript check
npm run test         # Run tests
```

---

## Mock Mode

When `MOCK_DATA_MODE=true` (default for development):

- **No API keys required**
- Returns 20 realistic local businesses (bakeries, salons, gyms, restaurants)
- Adds mock enrichment (social links, emails)
- Calculates real lead scores
- Generates template-based outreach messages
- Full CRM functionality works

Mock businesses are from Dindigul, Tamil Nadu, India. You can search any city/category.

---

## Testing

```bash
cd frontend && npm run test
cd backend && npm run test
```

---

## Deployment

### Frontend → Vercel

1. Connect GitHub repo to Vercel
2. Build command: `npm run build`
3. Output directory: `dist`
4. Root directory: `frontend`
5. Add environment variables from `.env.example`

### Backend → Render

1. New Web Service on Render
2. Root directory: `backend`
3. Build: `npm run build`
4. Start: `node dist/server.js`
5. Add environment variables

For production: set `NODE_ENV=production`, `MOCK_DATA_MODE=false`, and real API keys.

---

## Security Notes

- API keys are never exposed to the frontend
- Supabase service role key must only be in backend env
- RLS policies prevent cross-user data access at DB level
- Backend uses Helmet for security headers
- Rate limiting on search and AI endpoints
- Soft deletes — leads are archived, not permanently destroyed
- Only publicly listed business contact information is stored
- CORS whitelist prevents unauthorized frontend access

---

## Known Limitations

1. **In-memory storage in mock mode** — Data resets on server restart. Connect Supabase for persistence.
2. **Website enrichment may be blocked** — Some sites block scrapers; those leads are enriched from other sources.
3. **Google Places limit** — Text Search API returns max 20 results per call.
4. **XLSX export** — Currently generates CSV format.
5. **No real Supabase auth in V1** — Mock auth service is used. V2 will use Supabase JWT verification.
6. **No email confirmation flow** — Password reset is mocked.

---

## V2 Improvements

- Real Supabase JWT authentication
- Google Places pagination for 100+ leads
- True XLSX export
- BullMQ for reliable job queuing
- WebSocket/SSE for real-time job updates
- CSV lead import
- Team/workspace support
- Email sending integration (SMTP/SendGrid)
- WhatsApp Business API integration
- Playwright E2E test suite
- Additional data sources (Yelp, JustDial)
- Webhook integration for CRM sync
