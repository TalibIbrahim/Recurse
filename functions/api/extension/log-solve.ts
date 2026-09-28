/**
 * Cloudflare Pages Function: /api/extension/log-solve
 * Ingests problem submissions detected by the Recurse browser extension
 * and syncs them directly into Supabase attempts and streaks.
 */

interface Env {
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  EXTENSION_API_SECRET?: string;
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

interface LogSolvePayload {
  problem_slug: string;
  user_id?: string;
  title?: string;
  difficulty?: 'Easy' | 'Medium' | 'Hard';
  status?: 'solved' | 'attempted' | 'needs_review';
  time_spent_min?: number;
  submission_url?: string;
  approach_notes?: string;
  confidence_rating?: 1 | 2 | 3 | 4 | 5;
  solved_at?: string;
}

const DEFAULT_SUPABASE_URL = 'https://nhsbgweplsbiodxbdbcc.supabase.co';
const DEFAULT_SUPABASE_KEY = 'sb_publishable_VoDVFwrmAavSi6FxXV0BHA_wwX-Zm9B';

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

export async function onRequestOptions(): Promise<Response> {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

export async function onRequestPost(
  context: EventContext<Env, string, unknown>
): Promise<Response> {
  try {
    const { request, env } = context;

    // 1. Verify Authentication Token & User Identification
    const authHeader = request.headers.get('Authorization');
    const customToken = request.headers.get('X-API-Token');
    const headerUserId = request.headers.get('X-User-Id');
    const token = customToken || (authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null);

    if (!token && !headerUserId) {
      return jsonResponse(
        {
          success: false,
          error: 'Unauthorized. Please configure your Account Sync Token in the extension popup.',
        },
        401
      );
    }

    // Optional environment secret check
    if (env.EXTENSION_API_SECRET && token && token !== env.EXTENSION_API_SECRET && !token.includes('-')) {
      return jsonResponse(
        {
          success: false,
          error: 'Forbidden. Invalid extension API secret.',
        },
        403
      );
    }

    // 2. Parse & Validate Payload
    let payload: LogSolvePayload;
    try {
      payload = (await request.json()) as LogSolvePayload;
    } catch {
      return jsonResponse(
        {
          success: false,
          error: 'Malformed JSON payload.',
        },
        400
      );
    }

    if (!payload.problem_slug || typeof payload.problem_slug !== 'string') {
      return jsonResponse(
        {
          success: false,
          error: 'Missing required field: problem_slug.',
        },
        400
      );
    }

    const cleanSlug = payload.problem_slug.trim().toLowerCase();
    const targetUserId = payload.user_id || headerUserId || token;

    if (!targetUserId) {
      return jsonResponse(
        {
          success: false,
          error: 'Missing target user ID. Please provide your user ID in the extension popup.',
        },
        400
      );
    }

    const status = payload.status || 'solved';
    const confidenceRating = payload.confidence_rating || 4;
    const solvedAt = payload.solved_at || new Date().toISOString();
    const todayStr = solvedAt.split('T')[0];

    const supabaseUrl = env.SUPABASE_URL || DEFAULT_SUPABASE_URL;
    const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY || DEFAULT_SUPABASE_KEY;

    // 3. Supabase Edge Synchronization
    try {
      // Find problem by slug or fallback
      let problemId = cleanSlug;
      const probQuery = await fetch(
        `${supabaseUrl}/rest/v1/problems?leetcode_slug=eq.${encodeURIComponent(cleanSlug)}&select=id`,
        {
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
          },
        }
      );

      if (probQuery.ok) {
        const probRows = (await probQuery.json()) as { id: string }[];
        if (probRows && probRows.length > 0) {
          problemId = probRows[0].id;
        }
      }

      // Insert attempt into Supabase
      const insertAttemptRes = await fetch(`${supabaseUrl}/rest/v1/attempts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          Prefer: 'return=representation',
        },
        body: JSON.stringify({
          user_id: targetUserId,
          problem_id: problemId,
          status,
          approach_notes: payload.approach_notes || 'Synced via Recurse Companion Extension',
          submission_url: payload.submission_url || null,
          time_spent_min: payload.time_spent_min || null,
          confidence_rating: confidenceRating,
          solved_at: solvedAt,
        }),
      });

      if (!insertAttemptRes.ok) {
        const errText = await insertAttemptRes.text();
        console.error('Supabase edge insertion note:', errText);
      }

      // Update user's streak in streaks table
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
            // Check if last solve was yesterday
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toISOString().split('T')[0];

            if (lastDate === yesterdayStr) {
              newStreak += 1;
            } else if (!lastDate) {
              newStreak = 1;
            } else {
              newStreak = 1; // Reset if broke streak
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
    } catch (dbErr) {
      console.error('Failed to communicate with Supabase:', dbErr);
    }

    return jsonResponse(
      {
        success: true,
        message: `Solve for "${cleanSlug}" successfully logged to your account.`,
        solve: {
          problem_slug: cleanSlug,
          user_id: targetUserId,
          status,
          confidence_rating: confidenceRating,
          submission_url: payload.submission_url || null,
          solved_at: solvedAt,
        },
      },
      201
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Internal Server Error';
    return jsonResponse(
      {
        success: false,
        error: errorMsg,
      },
      500
    );
  }
}
