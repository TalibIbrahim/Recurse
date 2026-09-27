import { useState, useEffect, useCallback, useMemo } from 'react';
import { Badge } from '../data/types';
import { ALL_BADGES } from '../data/problemsSeed';
import { demoStore, DEMO_USER_ID } from '../lib/supabase';

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
 * dynamically assessing solve volume, streaks, and pattern mastery.
 */
export function useBadges(currentUserId?: string): UseBadgesReturn {
  const [unlockedBadges, setUnlockedBadges] = useState<readonly Badge[]>([]);
  const [lockedBadges, setLockedBadges] = useState<readonly Badge[]>([]);
  const [completionRate, setCompletionRate] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  const effectiveUserId = currentUserId || DEMO_USER_ID;

  const evaluate = useCallback(() => {
    try {
      setLoading(true);
      const result = demoStore.evaluateBadges(effectiveUserId);
      setUnlockedBadges(result.unlockedBadges);
      setLockedBadges(result.lockedBadges);
      setCompletionRate(result.completionRate);
    } finally {
      setLoading(false);
    }
  }, [effectiveUserId]);

  useEffect(() => {
    evaluate();
    const unsubAttempts = demoStore.subscribe('attempts', evaluate);
    const unsubStreaks = demoStore.subscribe('streaks', evaluate);

    return () => {
      unsubAttempts();
      unsubStreaks();
    };
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
