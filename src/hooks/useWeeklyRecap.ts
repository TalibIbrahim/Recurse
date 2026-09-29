import { useState, useEffect, useCallback, useMemo } from 'react';
import { WeeklyRecap } from '../data/types';
import { supabase } from '../lib/supabase';
import { hydrateAttempts, effectiveStreak, localDateKey, DIFFICULTY_POINTS } from '../lib/problems';
import { useDataRefresh } from '../lib/dataSync';

const CORE_TAGS = ['Dynamic Programming', 'Graph', 'Tree', 'Binary Search', 'Sliding Window'];

export interface UseWeeklyRecapReturn {
  readonly recap: WeeklyRecap | null;
  readonly weakestTag: string | null;
  readonly strongestTag: string | null;
  readonly friendComparison: WeeklyRecap['friend_comparison'] | null;
  readonly loading: boolean;
  readonly error: string | null;
  readonly refreshRecap: () => void;
}

/**
 * Hook to retrieve the user's weekly performance recap from Supabase,
 * highlighting total solves, points, strongest and weakest topic tags,
 * and peer percentile comparisons.
 */
export function useWeeklyRecap(currentUserId?: string): UseWeeklyRecapReturn {
  const [recap, setRecap] = useState<WeeklyRecap | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadRecap = useCallback(async () => {
    if (!currentUserId) {
      setRecap(null);
      setLoading(false);
      return;
    }

    try {
      setError(null);

      // Calculate start of current week (Monday 00:00:00)
      const now = new Date();
      const dayOfWeek = now.getDay();
      const diffToMonday = (dayOfWeek + 6) % 7;
      const monday = new Date(now);
      monday.setDate(now.getDate() - diffToMonday);
      monday.setHours(0, 0, 0, 0);
      const mondayIso = monday.toISOString();

      // Own attempts this week (all statuses, for weak-spot detection)
      const { data: weekRows, error: solveErr } = await supabase
        .from('attempts')
        .select('*')
        .eq('user_id', currentUserId)
        .gte('solved_at', mondayIso);

      if (solveErr) throw solveErr;

      const weekAttempts = hydrateAttempts(weekRows);
      const solves = weekAttempts.filter((a) => a.status === 'solved');

      const easyCount = solves.filter((s) => s.problem!.difficulty === 'Easy').length;
      const medCount = solves.filter((s) => s.problem!.difficulty === 'Medium').length;
      const hardCount = solves.filter((s) => s.problem!.difficulty === 'Hard').length;
      const totalPoints = solves.reduce((sum, a) => sum + DIFFICULTY_POINTS[a.problem!.difficulty], 0);
      const sundayDate = new Date(monday.getTime() + 6 * 86400000);

      const tagCounts = new Map<string, number>();
      solves.forEach((a) => a.problem!.tags.forEach((t) => tagCounts.set(t, (tagCounts.get(t) || 0) + 1)));
      let strongestTag: string | null = null;
      tagCounts.forEach((count, tag) => {
        if (!strongestTag || count > (tagCounts.get(strongestTag) || 0)) strongestTag = tag;
      });

      const struggled = weekAttempts.find(
        (a) =>
          (a.needs_revisit || a.status === 'needs_review' || (a.confidence_rating ?? 5) <= 2) &&
          a.problem!.tags.length > 0
      );
      const weakestTag = struggled?.problem!.tags[0] ?? CORE_TAGS.find((t) => !tagCounts.has(t)) ?? null;

      // Streak
      const { data: streakRow } = await supabase
        .from('streaks')
        .select('current_streak, last_active_date')
        .eq('user_id', currentUserId)
        .maybeSingle();

      // Friends' solves this week (RLS only exposes accepted friends' attempts)
      const { data: friendRows } = await supabase
        .from('attempts')
        .select('user_id, user:profiles(full_name, username)')
        .neq('user_id', currentUserId)
        .eq('status', 'solved')
        .gte('solved_at', mondayIso);

      const friendTotals = new Map<string, { count: number; name: string | null }>();
      (friendRows || []).forEach((row: unknown) => {
        const r = row as { user_id: string; user?: { full_name?: string; username?: string } | null };
        const entry = friendTotals.get(r.user_id) || {
          count: 0,
          name: r.user?.full_name || r.user?.username || null,
        };
        entry.count += 1;
        friendTotals.set(r.user_id, entry);
      });
      const friendCounts = Array.from(friendTotals.values());
      const friendAverage =
        friendCounts.length > 0
          ? Math.round((friendCounts.reduce((s, f) => s + f.count, 0) / friendCounts.length) * 10) / 10
          : 0;
      const topFriend = friendCounts.sort((a, b) => b.count - a.count)[0];
      const peersBehind = friendCounts.filter((f) => f.count < solves.length).length;
      const percentile =
        friendCounts.length > 0 ? Math.round((peersBehind / friendCounts.length) * 100) : 100;

      const generatedRecap: WeeklyRecap = {
        week_start: localDateKey(monday),
        week_end: localDateKey(sundayDate),
        total_solves: solves.length,
        easy_solves: easyCount,
        medium_solves: medCount,
        hard_solves: hardCount,
        points_earned: totalPoints,
        current_streak: effectiveStreak(streakRow?.current_streak, streakRow?.last_active_date),
        strongest_tag: strongestTag,
        weakest_tag: weakestTag,
        friend_comparison: {
          user_solves: solves.length,
          friend_average_solves: friendAverage,
          top_friend_name: topFriend?.name ?? null,
          user_percentile: percentile,
        },
      };

      setRecap(generatedRecap);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to compute weekly recap';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    loadRecap();
  }, [loadRecap]);

  useDataRefresh(loadRecap, Boolean(currentUserId));

  const weakestTag = useMemo<string | null>(() => {
    return recap?.weakest_tag || null;
  }, [recap]);

  const strongestTag = useMemo<string | null>(() => {
    return recap?.strongest_tag || null;
  }, [recap]);

  const friendComparison = useMemo<WeeklyRecap['friend_comparison'] | null>(() => {
    return recap?.friend_comparison || null;
  }, [recap]);

  return {
    recap,
    weakestTag,
    strongestTag,
    friendComparison,
    loading,
    error,
    refreshRecap: loadRecap,
  };
}

export default useWeeklyRecap;
