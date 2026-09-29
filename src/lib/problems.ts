import { Attempt, Problem, ProblemDifficulty } from '../data/types';
import { SEED_PROBLEMS } from '../data/problemsSeed';

// ============================================================================
// Problem resolution
// ----------------------------------------------------------------------------
// attempts.problem_id is free-form text: manual logs store the catalog id
// (e.g. "prob-1") while the browser extension stores the LeetCode slug
// (e.g. "two-sum"). There is no FK to public.problems, so problems are resolved
// client-side against the bundled catalog instead of via PostgREST embeds.
// ============================================================================

const byId = new Map(SEED_PROBLEMS.map((p) => [p.id, p]));
const bySlug = new Map(SEED_PROBLEMS.map((p) => [p.leetcode_slug, p]));

const DIFFICULTIES: readonly ProblemDifficulty[] = ['Easy', 'Medium', 'Hard'];

function titleFromSlug(slug: string): string {
  return slug
    .split('-')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function findCatalogProblem(problemId: string | null | undefined): Problem | undefined {
  if (!problemId) return undefined;
  return byId.get(problemId) || bySlug.get(problemId.toLowerCase());
}

/**
 * Resolve an attempt's problem. Falls back to a synthetic Problem built from the
 * slug (plus any title/difficulty the extension captured) for problems that are
 * not in the bundled catalog.
 */
export function resolveProblem(
  problemId: string,
  hints?: { title?: string | null; difficulty?: string | null }
): Problem {
  const found = findCatalogProblem(problemId);
  if (found) return found;

  const slug = problemId.toLowerCase();
  const difficulty = DIFFICULTIES.find((d) => d === hints?.difficulty) ?? 'Medium';
  return {
    id: problemId,
    frontend_id: 0,
    leetcode_slug: slug,
    title: hints?.title?.trim() || titleFromSlug(slug),
    difficulty,
    tags: [],
    company_tags: [],
    url: `https://leetcode.com/problems/${slug}/`,
    acceptance_rate: 0,
    cached_at: new Date(0).toISOString(),
  };
}

// Placeholder the extension RPC writes into approach_notes; not a real note.
export const EXTENSION_NOTE = 'Logged via Recurse Extension';

type AttemptRow = Attempt & {
  problem_title?: string | null;
  problem_difficulty?: string | null;
};

/**
 * Normalize a raw attempts row: attach its Problem and rewrite problem_id to the
 * canonical catalog id so slug-based (extension) and id-based (manual) attempts
 * match the same catalog entry.
 */
export function hydrateAttempt(row: unknown): Attempt {
  const r = row as AttemptRow;
  const problem = resolveProblem(r.problem_id, {
    title: r.problem_title,
    difficulty: r.problem_difficulty,
  });
  const fromExtension = r.approach_notes === EXTENSION_NOTE;
  return {
    ...r,
    approach_notes: fromExtension ? '' : r.approach_notes,
    logged_via_extension: fromExtension || r.logged_via_extension,
    problem_id: problem.id,
    problem,
  };
}

export function hydrateAttempts(rows: readonly unknown[] | null | undefined): Attempt[] {
  return (rows || []).map(hydrateAttempt);
}

// ============================================================================
// Local-time date helpers
// ----------------------------------------------------------------------------
// toISOString() is UTC, which shifts "today" by the user's offset (e.g. a solve
// at 2am in UTC+5 lands on the previous day). Use these for anything user-facing.
// ============================================================================

export function localDateKey(date: Date | string = new Date()): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function startOfLocalDayIso(date: Date = new Date()): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export function startOfLocalWeekIso(date: Date = new Date()): string {
  const d = new Date(date);
  const diffToMonday = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - diffToMonday);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

/**
 * streaks.current_streak is only recomputed when a solve is inserted, so a
 * streak that lapsed days ago still reads as active. last_active_date is a UTC
 * date (set by the DB), so compare in UTC.
 */
export function effectiveStreak(
  currentStreak: number | null | undefined,
  lastActiveDate: string | null | undefined
): number {
  if (!currentStreak || !lastActiveDate) return 0;
  const yesterdayUtc = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  return lastActiveDate >= yesterdayUtc ? currentStreak : 0;
}

export const DIFFICULTY_POINTS: Record<ProblemDifficulty, number> = {
  Easy: 1,
  Medium: 3,
  Hard: 5,
};
