/**
 * Cloudflare Worker entrypoint for Recurse
 * Handles API routes (/api/recap, /api/extension/*) and serves static assets.
 */

interface Env {
  ASSETS: {
    fetch: (request: Request) => Promise<Response>;
  };
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_ANON_KEY?: string;
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
}

const DEFAULT_SUPABASE_URL = 'https://nhsbgweplsbiodxbdbcc.supabase.co';
const DEFAULT_SUPABASE_KEY = 'sb_publishable_VoDVFwrmAavSi6FxXV0BHA_wwX-Zm9B';

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Token, X-User-Id',
};

function jsonResponse(data: unknown, status: number = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...CORS_HEADERS,
    },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // 1. Handle CORS Preflight for all API routes
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: CORS_HEADERS,
      });
    }

    // 2. Health & Connection Test Endpoint
    if (url.pathname === '/api/recap' || url.pathname === '/api/extension/test' || url.pathname === '/api/health') {
      return jsonResponse({
        success: true,
        status: 'online',
        message: 'Recurse API is reachable and operational.',
        timestamp: new Date().toISOString(),
      });
    }

    // 3. Extension Solve Logging Endpoint
    if (url.pathname === '/api/extension/log-solve' && request.method === 'POST') {
      try {
        const authHeader = request.headers.get('Authorization');
        const customToken = request.headers.get('X-API-Token');
        const headerUserId = request.headers.get('X-User-Id');
        const token = customToken || (authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null);

        let payload: {
          problem_slug?: string;
          user_id?: string;
          status?: string;
          submission_url?: string;
          time_spent_min?: number;
          confidence_rating?: number;
          solved_at?: string;
        } = {};

        try {
          payload = await request.json();
        } catch {
          return jsonResponse({ success: false, error: 'Invalid JSON payload' }, 400);
        }

        const targetUserId = payload.user_id || headerUserId || token;
        if (!targetUserId) {
          return jsonResponse({ success: false, error: 'Missing User ID / Sync Token' }, 401);
        }

        const problemSlug = (payload.problem_slug || '').trim().toLowerCase();
        if (!problemSlug) {
          return jsonResponse({ success: false, error: 'Missing problem_slug' }, 400);
        }

        const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL || DEFAULT_SUPABASE_URL;
        const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY || DEFAULT_SUPABASE_KEY;
        const solvedAt = payload.solved_at || new Date().toISOString();
        const todayStr = solvedAt.split('T')[0];

        // Sync attempt to Supabase
        const dbRes = await fetch(`${supabaseUrl}/rest/v1/attempts`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
            Prefer: 'return=representation',
          },
          body: JSON.stringify({
            user_id: targetUserId,
            problem_id: problemSlug,
            status: payload.status || 'solved',
            approach_notes: 'Logged via Recurse Extension',
            submission_url: payload.submission_url || null,
            time_spent_min: payload.time_spent_min || null,
            confidence_rating: payload.confidence_rating || 4,
            solved_at: solvedAt,
          }),
        });

        // Update streaks
        try {
          const streakRes = await fetch(
            `${supabaseUrl}/rest/v1/streaks?user_id=eq.${encodeURIComponent(targetUserId)}&select=*`,
            {
              headers: {
                apikey: supabaseKey,
                Authorization: `Bearer ${supabaseKey}`,
              },
            }
          );

          if (streakRes.ok) {
            const streakData = (await streakRes.json()) as {
              user_id: string;
              current_streak: number;
              longest_streak: number;
              last_active_date: string | null;
            }[];

            if (streakData && streakData.length > 0) {
              const current = streakData[0];
              const lastDate = current.last_active_date;
              let newStreak = current.current_streak;

              if (lastDate !== todayStr) {
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                const yesterdayStr = yesterday.toISOString().split('T')[0];

                if (lastDate === yesterdayStr) {
                  newStreak += 1;
                } else if (!lastDate) {
                  newStreak = 1;
                } else {
                  newStreak = 1;
                }

                const newLongest = Math.max(newStreak, current.longest_streak);

                await fetch(`${supabaseUrl}/rest/v1/streaks?user_id=eq.${encodeURIComponent(targetUserId)}`, {
                  method: 'PATCH',
                  headers: {
                    'Content-Type': 'application/json',
                    apikey: supabaseKey,
                    Authorization: `Bearer ${supabaseKey}`,
                  },
                  body: JSON.stringify({
                    current_streak: newStreak,
                    longest_streak: newLongest,
                    last_active_date: todayStr,
                    updated_at: new Date().toISOString(),
                  }),
                });
              }
            }
          }
        } catch {
          // Non-critical streak update error
        }

        return jsonResponse({
          success: true,
          message: `Solve for ${problemSlug} logged successfully.`,
          problem_slug: problemSlug,
          user_id: targetUserId,
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Server error';
        return jsonResponse({ success: false, error: msg }, 500);
      }
    }

    // 4. Default: Forward all other requests to static assets (SPA router)
    return env.ASSETS.fetch(request);
  },
};
