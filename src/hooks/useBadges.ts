import { useState, useEffect, useCallback, useMemo } from 'react';
import { Attempt, Badge, BadgeId } from '../data/types';
import { ALL_BADGES } from '../data/problemsSeed';
import { supabase } from '../lib/supabase';
import { hydrateAttempts, effectiveStreak, localDateKey } from '../lib/problems';
import { useDataRefresh } from '../lib/dataSync';

/** Progress toward each badge as [current, required]. */
function computeBadgeProgress(
  solves: readonly Attempt[],
  bestStreak: number,
  lastFreezeDate: string | null
): Record<BadgeId, [number, number]> {
  let easy = 0;
  let medium = 0;
  let hard = 0;
  let dp = 0;
  let tree = 0;
  let graph = 0;
  let nightShift = 0;
  const dpSolveTimes: number[] = [];

  for (const att of solves) {
    const prob = att.problem!;
    if (prob.difficulty === 'Easy') easy++;
    else if (prob.difficulty === 'Medium') medium++;
    else hard++;

    const tags = prob.tags.map((t) => t.toLowerCase());
    if (tags.some((t) => t.includes('dynamic programming'))) {
      dp++;
      dpSolveTimes.push(new Date(att.solved_at).getTime());
    }
    if (tags.some((t) => t.includes('tree') || t.includes('bst'))) tree++;
    if (tags.some((t) => t.includes('graph') || t.includes('breadth-first') || t.includes('depth-first'))) {
      graph++;
    }
    const hour = new Date(att.solved_at).getHours();
    if (hour >= 22 || hour < 4) nightShift++;
  }

  // Most DP solves inside any rolling 7-day window
  dpSolveTimes.sort((a, b) => a - b);
  let maxDpInWeek = 0;
  for (let i = 0, j = 0; j < dpSolveTimes.length; j++) {
    while (dpSolveTimes[j] - dpSolveTimes[i] > 7 * 86400000) i++;
    maxDpInWeek = Math.max(maxDpInWeek, j - i + 1);
  }

  // Longest run of consecutive solves rated 5/5 confidence
  let masteryRun = 0;
  let maxMasteryRun = 0;
  [...solves]
    .sort((a, b) => new Date(a.solved_at).getTime() - new Date(b.solved_at).getTime())
    .forEach((att) => {
      masteryRun = att.confidence_rating === 5 ? masteryRun + 1 : 0;
      maxMasteryRun = Math.max(maxMasteryRun, masteryRun);
    });

  // A solve logged after a streak freeze was spent
  const solvedAfterFreeze =
    lastFreezeDate !== null && solves.some((a) => localDateKey(a.solved_at) > lastFreezeDate);

  return {
    first_solve: [solves.length, 1],
    streak_7: [bestStreak, 7],
    streak_30: [bestStreak, 30],
    easy_master: [easy, 15],
    medium_master: [medium, 15],
    hard_master: [hard, 3],
    dp_specialist: [dp, 5],
    tree_climber: [tree, 8],
    graph_explorer: [graph, 5],
    half_century_50: [solves.length, 50],
    dp_blitz: [maxDpInWeek, 3],
    the_phoenix: [solvedAfterFreeze ? 1 : 0, 1],
    clean_sheet: [maxMasteryRun, 3],
    night_shift: [nightShift, 1],
  };
}

export interface UseBadgesReturn {
  readonly unlockedBadges: readonly Badge[];
  readonly lockedBadges: readonly Badge[];
  readonly allBadges: readonly Badge[];
  readonly completionRate: number;
  readonly loading: boolean;
  readonly refreshBadges: () => void;
}

/**
 * Hook to evaluate and track user milestone badges and achievements,
 * dynamically assessing real solve volume, streaks, and pattern mastery from Supabase.
 */
export function useBadges(currentUserId?: string): UseBadgesReturn {
  const [unlockedBadges, setUnlockedBadges] = useState<readonly Badge[]>([]);
  const [lockedBadges, setLockedBadges] = useState<readonly Badge[]>(ALL_BADGES);
  const [completionRate, setCompletionRate] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  const evaluate = useCallback(async () => {
    if (!currentUserId) {
      setUnlockedBadges([]);
      setLockedBadges(ALL_BADGES);
      setCompletionRate(0);
      setLoading(false);
      return;
    }

    try {
      // Fetch user solves
      const { data: attemptRows } = await supabase
        .from('attempts')
        .select('*')
        .eq('user_id', currentUserId)
        .eq('status', 'solved');
      const solves = hydrateAttempts(attemptRows);

      // Fetch user streak
      const { data: streakRow } = await supabase
        .from('streaks')
        .select('*')
        .eq('user_id', currentUserId)
        .maybeSingle();

      const currentStreak = effectiveStreak(streakRow?.current_streak, streakRow?.last_active_date);
      const longestStreak = streakRow?.longest_streak || 0;
      const bestStreak = Math.max(currentStreak, longestStreak);

      const progressById = computeBadgeProgress(solves, bestStreak, streakRow?.last_freeze_date ?? null);
      const latestSolveAt = solves.reduce<string | null>(
        (latest, a) => (!latest || a.solved_at > latest ? a.solved_at : latest),
        null
      );

      const unlocked: Badge[] = [];
      const locked: Badge[] = [];

      ALL_BADGES.forEach((b) => {
        const [have, need] = progressById[b.id] ?? [0, 1];
        if (have >= need) {
          unlocked.push({ ...b, unlocked_at: latestSolveAt || new Date().toISOString(), progress: 100 });
        } else {
          locked.push({ ...b, unlocked_at: null, progress: Math.round((have / need) * 100) });
        }
      });

      setUnlockedBadges(unlocked);
      setLockedBadges(locked);
      setCompletionRate(
        ALL_BADGES.length > 0 ? Math.round((unlocked.length / ALL_BADGES.length) * 100) : 0
      );
    } catch {
      setUnlockedBadges([]);
      setLockedBadges(ALL_BADGES);
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    evaluate();
  }, [evaluate]);

  useDataRefresh(evaluate, Boolean(currentUserId));

  const allBadges = useMemo<readonly Badge[]>(() => {
    return [...unlockedBadges, ...lockedBadges];
  }, [unlockedBadges, lockedBadges]);

  return {
    unlockedBadges,
    lockedBadges,
    allBadges: allBadges.length > 0 ? allBadges : ALL_BADGES,
    completionRate,
    loading,
    refreshBadges: evaluate,
  };
}

export default useBadges;
