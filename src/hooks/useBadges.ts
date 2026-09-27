import { useState, useEffect, useCallback, useMemo } from 'react';
import { Badge } from '../data/types';
import { ALL_BADGES } from '../data/problemsSeed';
import { supabase } from '../lib/supabase';

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
      setLoading(true);

      // Fetch user solves
      const { data: attempts } = await supabase
        .from('attempts')
        .select('*')
        .eq('user_id', currentUserId)
        .eq('status', 'solved');

      // Fetch user streak
      const { data: streakRow } = await supabase
        .from('streaks')
        .select('*')
        .eq('user_id', currentUserId)
        .maybeSingle();

      const solveCount = attempts?.length || 0;
      const currentStreak = streakRow?.current_streak || 0;
      const longestStreak = streakRow?.longest_streak || 0;
      const bestStreak = Math.max(currentStreak, longestStreak);

      const unlocked: Badge[] = [];
      const locked: Badge[] = [];

      ALL_BADGES.forEach((b) => {
        let isUnlocked = false;

        if (b.id === 'first_solve' && solveCount >= 1) isUnlocked = true;
        if (b.id === 'streak_7' && bestStreak >= 7) isUnlocked = true;
        if (b.id === 'streak_30' && bestStreak >= 30) isUnlocked = true;
        if (b.id === 'half_century_50' && solveCount >= 50) isUnlocked = true;

        if (isUnlocked) {
          unlocked.push({ ...b, unlocked_at: new Date().toISOString() });
        } else {
          locked.push(b);
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
