# Recurse

> A peer-group practice accountability platform engineered with Apple Human Interface Guidelines and deployed serverlessly to Cloudflare Pages edge.

---

## Architectural Overview

Recurse is designed for focused peer accountability in technical interview preparation. Rather than vanity scoreboards or generic gamification, it provides subtle, non-intrusive momentum tracking, spaced repetition nudges, and collaborative practice mechanics.

- **Frontend Application:** React 18 + TypeScript + Vite + Tailwind CSS + Framer Motion.
- **Surface Materials:** Custom translucent Glass Surface component with continuous squircle corners (`16px`), specular sheen highlights, and backdrop blur (`20px`).
- **Design System:** Strictly built upon Apple Human Interface Guidelines (8pt grid, SF Pro typography, semantic system colors, zero emojis, vector monochrome icons).
- **Backend & State:** Dual-mode architecture. Works out of the box with zero setup using an in-memory PubSub store and local persistence, or connects directly to Supabase for Postgres, Auth, and Row-Level Security (RLS).
- **Edge Deployment Target:** Cloudflare Pages for static frontend assets (`dist/`), with edge serverless handlers in `functions/api/**` (no external Node runtime required).

---

## Core Capabilities

### 1. Dual-Cadence Goal Tracking & Endowed Progress
- **Cadence Modes:** Set goals as "Daily Habit", "Flexible Weekly Stretch", or "Dual Mode (Both)".
- **Near-Miss Framing:** Explicit remaining count display (e.g., *"1 more to close daily rings"*, *"3 more to hit weekly stretch · 4 days left"*) rather than abstract percentages.
- **Endowed Progress:** Users maintaining an active consistency streak of 3 or more days receive an automatic +1 endowed momentum credit toward their weekly stretch goal.

### 2. Loss-Aversion Gamification & Streak Freezes
- **Streak Freezes:** Users receive 2 automatic streak freeze shields that apply seamlessly when a practice day is missed, preventing broken streaks without penalizing emergency rest.
- **Visible At-Risk Alerts:** Amber status warnings trigger when a user has not practiced today and their consistency streak is at risk before midnight.
- **Variable-Schedule Milestone & Surprise Badges:**
  - Standard Milestones: First Solve, 7-Day Streak, 30-Day Streak, Easy Master, Medium Master, Hard Master, DP Specialist, Tree Climber, Graph Explorer, Half-Century (50 solves).
  - Surprise Triggers:
    - *DP Blitz:* Solve 3 Dynamic Programming problems in a single 24-hour window.
    - *The Phoenix:* Recover momentum with 3 consecutive days of practice after a streak break.
    - *Clean Sheet:* Complete 5 consecutive problem solves with zero revisit flags.
    - *Night Shift:* Complete a problem solve between 00:00 and 05:00.

### 3. Curated List Import & Company Filtering
- Trackable checklists for standard industry lists:
  - **Blind 75** (Yangshun Tay's definitive 75 problems)
  - **NeetCode 150** (Comprehensive roadmap by algorithmic pattern)
  - **Grind 75** (High-yield ROI progression)
  - **LeetCode Top 150** (Official interview study plan)
- Integrated company-tag filtering: Google, Meta, Amazon, Microsoft, Apple, Bloomberg, Uber, Netflix.

### 4. Spaced Repetition & Qualitative Problem Notes
- **Problem Statuses:** Solved, Attempted, Needs Review.
- **Confidence Rating:** 1–5 qualitative mastery scale (*1: Shaky / Guessed*, *2: Heavy Hints*, *3: Concept Got, Slow*, *4: Clean Solution*, *5: Mastered / Can Teach*).
- **Stopwatch & Pomodoro:** Built-in timer that automatically populates actual solve duration.
- **Approach Notes:** Dedicated structured fields for pattern recognition, time complexity, and space complexity (discouraging raw code dumps in favor of intuition).

### 5. Peer Accountability & Gentle Social Comparison
- **Ambient Companion Ring:** Main dashboard pairs the user's practice rings with a peer's progress (e.g., *"Sarah Lin · 2 solves today"*), fostering camaraderie without toxic competition.
- **24-Hour Rate-Limited Pokes:** Send a practice reminder nudge to a peer, strictly throttled to at most once per 24 hours per friend.
- **1v1 Problem Duels:** Challenge a peer to solve a problem with a shared countdown timer; the fastest valid solve is recorded with time metrics.
- **Weekly Recap:** Edge-calculated performance debrief highlighting total volume, strongest pattern, weakest pattern for targeted review, and peer percentile standing.
- **Vector Stat Card:** Cloudflare Pages Function generating a clean SVG card suitable for developer profiles and social sharing.

### 6. Chrome / Edge Browser Companion Extension
- Manifest V3 browser extension located in `extension/`.
- Automatically detects successful submissions on `leetcode.com/problems/*` and dispatches solve metadata to the Cloudflare Pages ingestion endpoint (`/api/extension/log-solve`).

---

## Directory Structure

```
├── functions/                    # Cloudflare Pages Functions (Serverless Edge)
│   └── api/
│       ├── recap.ts              # Weekly performance summary edge function
│       ├── stat-card.ts          # Pure vector SVG developer card generator
│       └── extension/
│           └── log-solve.ts      # Extension solve webhook ingestion endpoint
├── extension/                    # Chrome / Edge Browser Extension (Manifest V3)
│   ├── manifest.json
│   ├── content.js
│   ├── popup.html
│   ├── popup.js
│   └── README.md
├── src/
│   ├── components/
│   │   ├── auth/                 # Sign In, Sign Up, and Persona Switcher
│   │   ├── badges/               # Milestone & Surprise Badges Grid
│   │   ├── comments/             # Peer problem discussion threads
│   │   ├── duels/                # 1v1 challenge modal & active timer banner
│   │   ├── extension/            # In-app browser extension setup modal
│   │   ├── friends/              # Friends list, requests, search & feed
│   │   ├── goals/                # Daily & Weekly rings, cadence modal
│   │   ├── layout/               # Glass navigation bar, Recurse brand logo
│   │   ├── leaderboard/          # Weekly peer rank & breakdown
│   │   ├── problems/             # Problem catalog, curated lists, attempt modal
│   │   ├── recap/                # Weekly recap modal
│   │   ├── revisit/              # Spaced repetition retention queue
│   │   ├── stats/                # Shareable developer stat card modal
│   │   ├── streak/               # Streak cards, freeze shields, 52-week heatmap
│   │   └── ui/                   # GlassCard surface, Recurse geometric logo
│   ├── data/
│   │   ├── problemsSeed.ts       # 50+ problems, curated lists, badges
│   │   └── types.ts              # Canonical TypeScript interfaces
│   ├── hooks/                    # 13 dedicated React data & mutation hooks
│   └── lib/
│       └── supabase.ts           # Supabase client + local PubSub demo fallback
├── supabase/
│   └── schema.sql                # Complete Postgres schema with strict RLS
├── scripts/
│   └── test-all-features.ts      # Automated 14-suite verification script
├── .gitignore                    # Strictly ignores dot-folders (.*) & build files
└── vite.config.ts                # Vite configuration with /api proxy
```

---

## Local Development Setup

### Prerequisites
- Node.js 18+ (tested on Node 20 and 22)
- npm or pnpm

### Quick Start (Demo Mode)
Recurse contains a complete client-side mock store that runs with full functionality out of the box with zero external dependencies:

```bash
# 1. Install dependencies
npm install

# 2. Run automated test suite (verifies 55 checkpoints)
npx tsx scripts/test-all-features.ts

# 3. Start local development server
npm run dev
```

Visit `http://localhost:5173` in your browser. You can immediately switch between pre-configured peer personas (Alex Chen, Sarah Lin, Marcus Vance) in the top-right menu to test real-time friend activity, duels, and pokes.

---

## Cloudflare Pages Deployment

### 1. Build Verification
```bash
npm run build
```
This generates the optimized static bundle in `dist/`.

### 2. Deploy via Cloudflare Dashboard
1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com/) and navigate to **Workers & Pages**.
2. Click **Create Application** > **Pages** > **Connect to Git**.
3. Select your repository.
4. Configure the build settings:
   - **Framework preset:** `Vite`
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Root directory:** `/`
5. Cloudflare Pages automatically detects the `functions/` folder and deploys all serverless edge handlers alongside the static frontend.

### 3. Deploy via Wrangler CLI
```bash
npx wrangler pages deploy dist --project-name recurse
```

---

## Supabase Production Configuration (Optional)

To connect Recurse to your own Supabase project:

1. Create a new project in [Supabase](https://supabase.com).
2. Open the **SQL Editor** in the Supabase dashboard and execute the contents of `supabase/schema.sql`. This sets up:
   - `profiles`, `friendships`, `daily_goals`, `problems`, `attempts`, `streaks`, `problem_comments`, `friend_pokes`, `duels`.
   - Complete Row-Level Security (RLS) policies ensuring users can only read their own attempts or those of accepted friends.
3. In your Cloudflare Pages project settings, add the following Environment Variables:
   - `VITE_SUPABASE_URL`: Your Supabase Project URL (`https://xyz.supabase.co`)
   - `VITE_SUPABASE_ANON_KEY`: Your Supabase public anonymous key
   - `EXTENSION_API_SECRET`: (Optional) Shared secret string for the browser extension

---

## Installing the Browser Companion Extension

1. Open Chrome or Edge and navigate to `chrome://extensions/` (or `edge://extensions/`).
2. Toggle on **Developer mode** in the top-right corner.
3. Click **Load unpacked** and select the `extension/` folder from this repository.
4. Click the Recurse icon in your browser toolbar to enter your server URL (`https://your-recurse-deployment.pages.dev` or `http://localhost:5173`) and API Token.
5. Solve problems on `leetcode.com` as normal. When your submission shows "Accepted", Recurse automatically ingests the solve.

---

## Verification & Quality Standards

- **Zero Emojis Policy:** Verified with an automated scanner. All UI visual cues utilize crisp vector SVG icons (`lucide-react`) and Apple-inspired typographic hierarchy.
- **Type Safety:** 100% strict TypeScript compliance with zero `any` overrides.
- **Git Privacy:** Root `.gitignore` includes `.*/` to guarantee internal agent logs and private configurations are never committed to version control.
