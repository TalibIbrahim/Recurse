/**
 * Cloudflare Pages Function: /api/stat-card
 * Dynamically generates a high-resolution, vector SVG performance stat card.
 * Zero external binary dependencies; runs purely on the Cloudflare edge runtime.
 */

interface Env {
  [key: string]: unknown;
}

interface EventContext<E, P extends string, D> {
  request: Request;
  functionPath: string;
  waitUntil: (promise: Promise<unknown>) => void;
  next: (input?: Request | string, init?: RequestInit) => Promise<Response>;
  env: E;
  params: Record<P, string | string[]>;
  data: D;
}

export async function onRequestGet(
  context: EventContext<Env, string, unknown>
): Promise<Response> {
  const url = new URL(context.request.url);

  // Extract query parameters with fallbacks
  const username = (url.searchParams.get('user') || 'Alex Chen').replace(/[<>&"']/g, '');
  const streak = Math.max(0, parseInt(url.searchParams.get('streak') || '6', 10));
  const easy = Math.max(0, parseInt(url.searchParams.get('easy') || '18', 10));
  const medium = Math.max(0, parseInt(url.searchParams.get('medium') || '24', 10));
  const hard = Math.max(0, parseInt(url.searchParams.get('hard') || '6', 10));
  const totalSolves = easy + medium + hard;

  // Calculate percentages for the stacked progress bar
  const safeTotal = totalSolves > 0 ? totalSolves : 1;
  const easyPct = Math.round((easy / safeTotal) * 100);
  const mediumPct = Math.round((medium / safeTotal) * 100);
  const hardPct = Math.max(0, 100 - easyPct - mediumPct);

  // Width of the 480px progress bar
  const totalBarWidth = 480;
  const easyWidth = Math.round((easy / safeTotal) * totalBarWidth);
  const mediumWidth = Math.round((medium / safeTotal) * totalBarWidth);
  const hardWidth = Math.max(0, totalBarWidth - easyWidth - mediumWidth);

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="600" height="320" viewBox="0 0 600 320" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Background Gradient -->
    <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0B0F19" />
      <stop offset="100%" stop-color="#111827" />
    </linearGradient>

    <!-- Card Glow Filter -->
    <filter id="cardGlow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="#000000" flood-opacity="0.5" />
    </filter>

    <!-- Accent Gradient for Streak -->
    <linearGradient id="streakGradient" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#F97316" />
      <stop offset="100%" stop-color="#EAB308" />
    </linearGradient>
  </defs>

  <style>
    .font-base { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
    .label-meta { font-size: 11px; font-weight: 600; fill: #64748B; letter-spacing: 0.08em; text-transform: uppercase; }
    .title-user { font-size: 20px; font-weight: 700; fill: #F8FAFC; letter-spacing: -0.01em; }
    .brand-tag { font-size: 11px; font-weight: 700; fill: #38BDF8; letter-spacing: 0.12em; text-transform: uppercase; }
    .val-number { font-size: 28px; font-weight: 800; letter-spacing: -0.03em; }
    .sub-stat { font-size: 12px; font-weight: 500; fill: #94A3B8; }
    .badge-chip { font-size: 11px; font-weight: 600; fill: #CBD5E1; }
  </style>

  <!-- Card Background with Stroke -->
  <rect x="10" y="10" width="580" height="300" rx="16" fill="url(#bgGradient)" stroke="#1E293B" stroke-width="1.5" filter="url(#cardGlow)" />

  <!-- Top Decorative Edge Accent -->
  <rect x="24" y="10" width="120" height="2" fill="#38BDF8" rx="1" />

  <!-- Header Section -->
  <g transform="translate(40, 42)">
    <!-- Brand / Product Label -->
    <text x="0" y="0" class="font-base brand-tag">RECURSE</text>
    <circle cx="70" cy="-4" r="3" fill="#38BDF8" />
    <text x="82" y="0" class="font-base label-meta">PERFORMANCE DOSSIER</text>

    <!-- User Full Name -->
    <text x="0" y="28" class="font-base title-user">${username}</text>
  </g>

  <!-- Total Solves Counter (Top Right) -->
  <g transform="translate(440, 40)">
    <text x="120" y="0" text-anchor="end" class="font-base label-meta">TOTAL SOLVED</text>
    <text x="120" y="28" text-anchor="end" class="font-base val-number" fill="#38BDF8">${totalSolves}</text>
  </g>

  <!-- Metric Divider Line -->
  <line x1="40" y1="95" x2="560" y2="95" stroke="#1E293B" stroke-width="1" />

  <!-- Middle Stats Row -->
  <!-- 1. Current Streak -->
  <g transform="translate(40, 120)">
    <!-- Flame Icon (Vector SVG path, zero emojis) -->
    <path d="M8 0C8 0 12 4 12 8C12 11.3137 9.31371 14 6 14C2.68629 14 0 11.3137 0 8C0 5 4 1 4 1C4 1 3 4 5 5C7 6 8 0 8 0Z" fill="url(#streakGradient)" transform="translate(0, 2)" />
    <text x="20" y="12" class="font-base label-meta">STREAK</text>
    <text x="0" y="44" class="font-base val-number" fill="#F97316">${streak}</text>
    <text x="42" y="42" class="font-base sub-stat">days</text>
  </g>

  <!-- 2. Easy Solves -->
  <g transform="translate(180, 120)">
    <circle cx="4" cy="8" r="4" fill="#10B981" />
    <text x="16" y="12" class="font-base label-meta">EASY</text>
    <text x="0" y="44" class="font-base val-number" fill="#10B981">${easy}</text>
    <text x="44" y="42" class="font-base sub-stat">${easyPct}%</text>
  </g>

  <!-- 3. Medium Solves -->
  <g transform="translate(320, 120)">
    <circle cx="4" cy="8" r="4" fill="#F59E0B" />
    <text x="16" y="12" class="font-base label-meta">MEDIUM</text>
    <text x="0" y="44" class="font-base val-number" fill="#F59E0B">${medium}</text>
    <text x="48" y="42" class="font-base sub-stat">${mediumPct}%</text>
  </g>

  <!-- 4. Hard Solves -->
  <g transform="translate(460, 120)">
    <circle cx="4" cy="8" r="4" fill="#EF4444" />
    <text x="16" y="12" class="font-base label-meta">HARD</text>
    <text x="0" y="44" class="font-base val-number" fill="#EF4444">${hard}</text>
    <text x="36" y="42" class="font-base sub-stat">${hardPct}%</text>
  </g>

  <!-- Stacked Breakdown Progress Bar -->
  <g transform="translate(40, 195)">
    <rect x="0" y="0" width="${totalBarWidth}" height="8" rx="4" fill="#1E293B" />
    ${easyWidth > 0 ? `<rect x="0" y="0" width="${easyWidth}" height="8" rx="4" fill="#10B981" />` : ''}
    ${mediumWidth > 0 ? `<rect x="${easyWidth}" y="0" width="${mediumWidth}" height="8" rx="0" fill="#F59E0B" />` : ''}
    ${hardWidth > 0 ? `<rect x="${easyWidth + mediumWidth}" y="0" width="${hardWidth}" height="8" rx="4" fill="#EF4444" />` : ''}
  </g>

  <!-- Badges / Milestone Chips Row (Bottom) -->
  <g transform="translate(40, 235)">
    <!-- Badge 1: 7-Day Consistency -->
    <rect x="0" y="0" width="150" height="34" rx="8" fill="#1E293B" stroke="#334155" stroke-width="1" />
    <!-- Award Icon Vector -->
    <circle cx="20" cy="17" r="6" stroke="#38BDF8" stroke-width="1.5" fill="none" />
    <path d="M17 21L15 26L20 23L25 26L23 21" stroke="#38BDF8" stroke-width="1.2" fill="none" />
    <text x="34" y="21" class="font-base badge-chip">7-Day Consistency</text>

    <!-- Badge 2: DP Specialist -->
    <rect x="165" y="0" width="145" height="34" rx="8" fill="#1E293B" stroke="#334155" stroke-width="1" />
    <rect x="180" y="11" width="12" height="12" rx="2" stroke="#A855F7" stroke-width="1.5" fill="none" />
    <circle cx="186" cy="17" r="2" fill="#A855F7" />
    <text x="200" y="21" class="font-base badge-chip">DP Specialist</text>

    <!-- Badge 3: Tree Climber -->
    <rect x="325" y="0" width="135" height="34" rx="8" fill="#1E293B" stroke="#334155" stroke-width="1" />
    <circle cx="340" cy="14" r="3" stroke="#10B981" stroke-width="1.5" fill="none" />
    <circle cx="335" cy="22" r="2.5" stroke="#10B981" stroke-width="1.2" fill="none" />
    <circle cx="345" cy="22" r="2.5" stroke="#10B981" stroke-width="1.2" fill="none" />
    <line x1="340" y1="17" x2="335" y2="19.5" stroke="#10B981" stroke-width="1" />
    <line x1="340" y1="17" x2="345" y2="19.5" stroke="#10B981" stroke-width="1" />
    <text x="355" y="21" class="font-base badge-chip">Tree Climber</text>
  </g>
</svg>`;

  return new Response(svg, {
    status: 200,
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
