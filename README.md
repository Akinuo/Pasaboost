# PasaBoost 🎓

**An AI-Powered Essay Coaching System for Enhancing College Entrance Examination Writing Performance**

> **Stack: Next.js 14 (App Router) + Supabase + Groq**

PasaBoost is a full-stack web application that helps Filipino high school students prepare for
college entrance examinations (UPCAT, ACET, DCAT, USTET) by providing AI-generated essay feedback
using a Philippine admissions rubric, powered by the Groq LLM API.

This is the **Next.js + Supabase edition**. Compared to a split frontend/backend architecture,
everything here — pages, API route, and database — lives in one deployable Next.js project, backed
by Supabase for auth, Postgres, and realtime.

---

## 📚 Table of Contents

- [What Changed From the React+Vite Edition](#what-changed-from-the-reactvite-edition)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Deployment](#deployment)
- [Rubric Scoring](#rubric-scoring)
- [Security](#security)
- [API Reference](#api-reference)

---

## What Changed From the React+Vite Edition

If you've seen an earlier version of PasaBoost built with React + Vite + Firebase + a separate
Express/Cloudflare backend, here's what's different — and why it's simpler:

| | Before (Vite + Firebase) | Now (Next.js + Supabase) |
|---|---|---|
| Framework | React + Vite (SPA) | Next.js 14 App Router |
| Routing | React Router | File-based routing (`app/`) |
| Auth | Firebase Auth | Supabase Auth |
| Database | Firestore (NoSQL) | Supabase Postgres (SQL) |
| Security rules | `firestore.rules` | Postgres Row Level Security |
| Backend for `/score-essay` | Separate Express server or Cloudflare Worker | **A single Next.js Route Handler** — no separate deployment |
| Hosting | Firebase Hosting + Railway/Render/Cloudflare (2 services) | **Vercel only** (1 service) + Supabase |
| Realtime updates | Firestore `onSnapshot` | Supabase Realtime (`postgres_changes`) |

**The biggest simplification:** the secure scoring endpoint is now `app/api/score-essay/route.ts` —
an ordinary file in the same project as your frontend. There's no second server to deploy, no CORS
configuration, and no separate secrets dashboard. Push to Vercel and both the UI and the API ship
together.

---

## ✨ Features

- **AI Essay Scoring** — Instant feedback on 5 rubric dimensions (20 pts each, 100 total)
- **Smart Essay Editor** — Autosaving, draft management, word count tracking
- **Paragraph Rewrites** — Side-by-side AI rewrites with explanations for weak paragraphs
- **Detailed Feedback** — Strengths, weaknesses, and actionable improvement suggestions
- **Progress Analytics** — Score progression charts, dimension trends, writing frequency
- **Daily Writing Prompts** — 20+ Philippine-focused prompts across 8 categories
- **Essay History** — Searchable, filterable history of all scored essays, live-updated via Supabase Realtime
- **Anonymous Leaderboard** — Optional peer ranking with auto-generated aliases
- **Dark Mode** — Full light/dark/system theme support

### Exam Coverage
| Exam | School |
|------|--------|
| UPCAT | University of the Philippines System |
| ACET | Ateneo de Manila University |
| DCAT | De La Salle University |
| USTET | University of Santo Tomas |
| General | Any Philippine college |

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | **Next.js 14** (App Router, Route Handlers, Middleware) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| UI Primitives | Radix UI (shadcn/ui pattern) |
| Animation | Framer Motion |
| Forms | React Hook Form + Zod |
| Charts | Recharts |
| Icons | Lucide React |
| Auth | **Supabase Auth** (Email/Password + Google OAuth) |
| Database | **Supabase Postgres** with Row Level Security |
| Realtime | Supabase Realtime (`postgres_changes`) |
| AI | Groq API (`llama-3.3-70b-versatile`) |
| Hosting | **Vercel** (frontend + API route together) |

---

## 📁 Project Structure

```
pasaboost-nextjs/
├── app/
│   ├── layout.tsx                    # Root layout: fonts, providers
│   ├── page.tsx                      # Landing page
│   ├── globals.css                   # Design system (CSS variables, components)
│   ├── not-found.tsx                 # 404 page
│   ├── login/page.tsx                # Sign in
│   ├── register/page.tsx             # Sign up
│   ├── auth/callback/route.ts        # OAuth redirect handler
│   ├── (app)/                        # Route group — all protected pages
│   │   ├── layout.tsx                #   Sidebar shell
│   │   ├── dashboard/page.tsx
│   │   ├── editor/page.tsx           #   Essay editor with autosave
│   │   ├── score/[scoreId]/page.tsx  #   AI feedback report
│   │   ├── history/page.tsx
│   │   ├── analytics/page.tsx
│   │   ├── prompts/page.tsx
│   │   ├── leaderboard/page.tsx
│   │   └── profile/page.tsx
│   └── api/
│       └── score-essay/route.ts      # 🔒 Secure scoring endpoint (Groq key lives here)
├── components/
│   ├── layout/AppSidebar.tsx
│   ├── ui/LoadingScreen.tsx
│   └── providers/
│       ├── AuthProvider.tsx          # Client-side auth state
│       └── ThemeProvider.tsx         # Dark mode
├── lib/
│   ├── supabase/
│   │   ├── client.ts                 # Browser Supabase client
│   │   ├── server.ts                 # Server Component / Route Handler client
│   │   └── middleware.ts             # Session refresh helper
│   ├── queries.ts                    # All Postgres reads/writes (replaces firestore.ts)
│   ├── scoreApi.ts                   # Calls our own /api/score-essay + mock fallback
│   ├── prompts.ts                    # Static writing prompts data
│   ├── utils.ts
│   └── database.types.ts             # Hand-authored, regenerate with `npm run db:types`
├── types/
│   └── index.ts                      # App-level TypeScript types
├── supabase/
│   ├── migrations/0001_init.sql      # Full schema + RLS policies + triggers
│   └── config.toml                   # Local dev config
├── middleware.ts                     # Route protection (redirects, session refresh)
├── public/favicon.svg
├── next.config.mjs
├── tailwind.config.ts
├── vercel.json
├── .env.example
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** v18.18 or higher
- A **Supabase** account (free tier) — [supabase.com](https://supabase.com)
- A **Groq** API key (free) — [console.groq.com](https://console.groq.com)
- (Optional) **Vercel** account for deployment — [vercel.com](https://vercel.com)

---

### 1. Create a Supabase Project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard) → **New Project**
2. Choose a region close to the Philippines (e.g. Singapore)
3. Save your database password somewhere safe

### 2. Run the Database Migration

**Option A — via SQL Editor (fastest):**
1. Open your project → **SQL Editor** → **New query**
2. Paste the entire contents of `supabase/migrations/0001_init.sql`
3. Click **Run**

**Option B — via Supabase CLI:**
```bash
npm install -g supabase
supabase login
supabase link --project-ref your-project-ref
supabase db push
```

This creates all tables (`profiles`, `user_stats`, `drafts`, `scores`, `leaderboard`), enables
Row Level Security, and sets up triggers that auto-create a profile + stats row on signup.

### 3. Enable Auth Providers

In your Supabase Dashboard → **Authentication → Providers**:
- **Email** is enabled by default
- **Google**: toggle it on, then paste your Google OAuth Client ID/Secret
  (create these at [Google Cloud Console](https://console.cloud.google.com/apis/credentials) —
  add `https://your-project-ref.supabase.co/auth/v1/callback` as an authorized redirect URI)

Under **Authentication → URL Configuration**, set:
- **Site URL:** `http://localhost:3000` (change to your production URL after deploying)
- **Redirect URLs:** add `http://localhost:3000/auth/callback` and your production equivalent

### 4. Get Your API Keys

From **Project Settings → API**:
- `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
- `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (keep secret, server-only)

### 5. Get a Groq API Key

Sign up free at [console.groq.com/keys](https://console.groq.com/keys) → **Create API Key**

### 6. Configure and Run

```bash
git clone <repository-url>
cd pasaboost-nextjs
cp .env.example .env.local
# Edit .env.local with your Supabase + Groq keys

npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 7. Running Tests

```bash
npm run test          # run once
npm run test:watch    # watch mode
npm run test:coverage # with coverage report
```

Tests cover pure scoring/formatting logic in `lib/` plus route-level integration tests for the
critical API endpoints (auth gate, rate limiting, input validation, and upstream AI-service
failure handling) under `app/api/**/*.test.ts`. Supabase and the Groq SDK are mocked — these are
fast, no-network tests, not end-to-end tests against real infra.

---

## 🔑 Environment Variables

| Variable | Where used | Required |
|----------|-----------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Browser + Server | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser + Server | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only (admin ops) | Optional |
| `SUPABASE_PROJECT_ID` | `npm run db:types` only | Optional |
| `GROQ_API_KEY` | `app/api/score-essay` only | ✅ |
| `GOOGLE_OAUTH_CLIENT_ID` / `_SECRET` | Local Supabase CLI config only | Optional |

`NEXT_PUBLIC_*` variables are exposed to the browser by Next.js — this is expected and safe for
Supabase's anon key, since Row Level Security (not secrecy of this key) is what protects your data.
`GROQ_API_KEY` has **no** `NEXT_PUBLIC_` prefix, so it's only ever readable from the server-side
route handler, never shipped to the browser.

---

## 🌐 Deployment

### Deploy to Vercel (one service — frontend + API)

```bash
npm install -g vercel
vercel login
vercel
```

Or connect your GitHub repo directly at [vercel.com/new](https://vercel.com/new) — Vercel
auto-detects Next.js and configures the build.

**Set environment variables** in Vercel Dashboard → Project → Settings → Environment Variables:
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
GROQ_API_KEY
```

**Update Supabase redirect URLs** to include your Vercel domain:
```
https://your-app.vercel.app/auth/callback
```

That's the entire deployment. There is no second service to configure — the `/api/score-essay`
route ships as a Vercel Serverless Function automatically alongside the rest of the app.

---

## 📊 Rubric Scoring

| Dimension | Max Score | Description |
|-----------|-----------|-------------|
| **Content** | 20 | Relevance, depth, idea development, use of examples and evidence |
| **Organization** | 20 | Introduction, body paragraphs, conclusion, logical flow |
| **Grammar** | 20 | Sentence construction, accuracy, punctuation, vocabulary choice |
| **Coherence** | 20 | Transitions, unity, paragraph coherence, idea progression |
| **Argument** | 20 | Thesis clarity, reasoning strength, persuasiveness |
| **Total** | **100** | |

### Score Bands
| Band | Range |
|------|-------|
| Excellent | 90–100 |
| Proficient | 75–89 |
| Developing | 60–74 |
| Beginning | 45–59 |
| Needs Improvement | <45 |

---

## 🔒 Security

### Authentication
- Supabase Auth manages all sign-in flows (email/password + Google OAuth)
- Sessions are stored in **httpOnly cookies**, refreshed automatically by `middleware.ts` on every request
- The API route (`/api/score-essay`) reads the session server-side via cookies — no manual token passing needed

### Database Security — Row Level Security (RLS)
Every table has RLS enabled. Policies (see `supabase/migrations/0001_init.sql`) ensure:
- Users can only read/write rows where `user_id = auth.uid()`
- **Scores are immutable** — there is no `UPDATE` policy on the `scores` table, only `INSERT`/`SELECT`/`DELETE`
- The leaderboard is readable by any authenticated user, but each user can only write their own row

### API Key Protection
- `GROQ_API_KEY` has no `NEXT_PUBLIC_` prefix → never bundled into client-side JavaScript
- All Groq calls happen inside `app/api/score-essay/route.ts`, which runs only on the server

### Rate Limiting
- 20 scoring requests per hour per user, enforced by counting rows in the existing `scores` table
  (no separate Redis/KV infrastructure needed — see `getRecentScoreCount()` in `lib/queries.ts`)

### Input Validation
- Zod schemas validate the essay, prompt, and exam type before any AI call is made
- Essay length capped at 50–10,000 characters

---

## 📝 API Reference

### POST /api/score-essay

Score an essay using the Groq LLM API. Requires an active Supabase session cookie (the browser
sends this automatically; no manual `Authorization` header needed).

**Request Body:**
```json
{
  "essay": "string (50–10000 chars)",
  "prompt": "string (optional, max 500 chars)",
  "examType": "UPCAT | ACET | DCAT | USTET | General"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "score": {
    "totalScore": 78,
    "rubricScores": [
      { "dimension": "Content", "score": 16, "maxScore": 20, "feedback": "...", "strengths": ["..."], "weaknesses": ["..."] }
    ],
    "overallFeedback": "...",
    "strengths": ["..."],
    "weaknesses": ["..."],
    "suggestions": ["...", "...", "..."],
    "paragraphRewrites": [
      { "original": "...", "rewritten": "...", "explanation": "...", "improvements": ["..."] }
    ],
    "estimatedBand": "Proficient (75-89)",
    "modelVersion": "llama-3.3-70b-versatile"
  },
  "rateLimitRemaining": 19
}
```

**Error Responses:**
- `400` — Invalid input (validation failed)
- `401` — Not signed in
- `429` — Rate limit exceeded (20/hour)
- `503` — `GROQ_API_KEY` not configured
- `500` — Server error

---

## 🙏 Acknowledgments

- **Groq** for fast LLM inference
- **Supabase** for the generous free tier (Auth + Postgres + Realtime)
- **Vercel** for zero-config Next.js hosting
- **Anthropic** for Claude, used in development assistance

---

*Built with ❤️ for Filipino students. Pasa na tayo! 🇵🇭*
