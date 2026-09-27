/**
 * Cloudflare Pages Function: /api/extension/log-solve
 * Ingests problem submissions detected by the Recurse browser extension.
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
  title?: string;
  difficulty?: 'Easy' | 'Medium' | 'Hard';
  status?: 'solved' | 'attempted' | 'needs_review';
  time_spent_min?: number;
  submission_url?: string;
  approach_notes?: string;
  confidence_rating?: 1 | 2 | 3 | 4 | 5;
  code_snippet?: string;
  solved_at?: string;
}

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Token',
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

    // 1. Verify Authentication Token
    const authHeader = request.headers.get('Authorization');
    const customToken = request.headers.get('X-API-Token');
    const token = customToken || (authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null);

    if (!token) {
      return jsonResponse(
        {
          success: false,
          error: 'Unauthorized. Missing API token in Authorization or X-API-Token header.',
        },
        401
      );
    }

    // Optional environment secret check
    if (env.EXTENSION_API_SECRET && token !== env.EXTENSION_API_SECRET) {
      return jsonResponse(
        {
          success: false,
          error: 'Forbidden. Invalid API token provided.',
        },
        403
      );
    }

    // 2. Parse & Validate Payload
    let payload: LogSolvePayload;
    try {
      payload = await request.json() as LogSolvePayload;
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
    const status = payload.status || 'solved';
    const confidenceRating = payload.confidence_rating;
    if (confidenceRating !== undefined && (!Number.isInteger(confidenceRating) || confidenceRating < 1 || confidenceRating > 5)) {
      return jsonResponse(
        {
          success: false,
          error: 'Invalid confidence_rating. Must be an integer between 1 and 5.',
        },
        400
      );
    }

    const solvedAt = payload.solved_at || new Date().toISOString();

    // 3. Supabase edge synchronization (if credentials configured in Pages env)
    if (env.SUPABASE_URL && (env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY)) {
      const apiKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY;
      try {
        const dbRes = await fetch(`${env.SUPABASE_URL}/rest/v1/attempts`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: apiKey!,
            Authorization: `Bearer ${apiKey}`,
            Prefer: 'return=representation',
          },
          body: JSON.stringify({
            problem_id: cleanSlug,
            status,
            approach_notes: payload.approach_notes || 'Logged via Recurse Browser Extension',
            submission_url: payload.submission_url || null,
            time_spent_min: payload.time_spent_min || null,
            confidence_rating: confidenceRating || null,
            solved_at: solvedAt,
          }),
        });

        if (!dbRes.ok) {
          const errText = await dbRes.text();
          console.error('Supabase edge insertion warning:', errText);
        }
      } catch (dbErr) {
        console.error('Failed to communicate with Supabase:', dbErr);
      }
    }

    return jsonResponse(
      {
        success: true,
        message: 'Solve successfully logged from extension.',
        solve: {
          problem_slug: cleanSlug,
          title: payload.title || cleanSlug,
          difficulty: payload.difficulty || 'Medium',
          status,
          confidence_rating: confidenceRating ?? 3,
          submission_url: payload.submission_url || null,
          time_spent_min: payload.time_spent_min || null,
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
