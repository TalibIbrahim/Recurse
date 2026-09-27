import { useState, useEffect, useCallback, useMemo } from 'react';
import { WeeklyRecap } from '../data/types';
import { demoStore, DEMO_USER_ID } from '../lib/supabase';

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
 * Hook to retrieve the user's weekly performance recap,
 * highlighting total solves, points, strongest and weakest topic tags,
 * and peer percentile comparisons.
 */
export function useWeeklyRecap(currentUserId?: string): UseWeeklyRecapReturn {
  const [recap, setRecap] = useState<WeeklyRecap | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const effectiveUserId = currentUserId || DEMO_USER_ID;

  const loadRecap = useCallback(() => {
    try {
      setLoading(true);
      setError(null);
      const data = demoStore.getWeeklyRecap(effectiveUserId);
      setRecap(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to compute weekly recap';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [effectiveUserId]);

  useEffect(() => {
    loadRecap();
    const unsubAttempts = demoStore.subscribe('attempts', loadRecap);
    const unsubFriendships = demoStore.subscribe('friendships', loadRecap);

    return () => {
      unsubAttempts();
      unsubFriendships();
    };
  }, [loadRecap]);

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
