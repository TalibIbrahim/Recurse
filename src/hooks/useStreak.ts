import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  supabase,
  isSupabaseConfigured,
  isDemoModeActive,
  demoStore,
  DEMO_USER_ID,
} from '../lib/supabase';
import { Streak, HeatmapData, HeatmapCell, ProblemDifficulty } from '../data/types';
import { SEED_PROBLEMS } from '../data/problemsSeed';

export interface UseStreakReturn {
  readonly streak: Streak | null;
  readonly heatmapData: HeatmapData;
  readonly loading: boolean;
  readonly error: string | null;
  readonly refreshStreak: () => Promise<void>;
}

export function useStreak(currentUserId?: string): UseStreakReturn {
  const [streak, setStreak] = useState<Streak | null>(null);
  const [rawSolves, setRawSolves] = useState<
    readonly {
      date: string;
      problemId: string;
      title: string;
      difficulty: ProblemDifficulty;
    }[]
  >([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const effectiveUserId = currentUserId || DEMO_USER_ID;
  const isDemo = isDemoModeActive() || !isSupabaseConfigured;

  const loadDemoStreakAndSolves = useCallback(() => {
    try {
      const s = demoStore.getStreak(effectiveUserId);
      setStreak(s);

      const attempts = demoStore
        .getAttempts(effectiveUserId)
        .filter((a) => a.status === 'solved');

      const probMap = new Map(SEED_PROBLEMS.map((p) => [p.id, p]));

      const solves = attempts.map((a) => {
        const prob = a.problem || probMap.get(a.problem_id);
        return {
          date: a.solved_at.split('T')[0],
          problemId: a.problem_id,
          title: prob?.title || 'Problem',
          difficulty: prob?.difficulty || 'Medium',
        };
      });

      setRawSolves(solves);
      setLoading(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load streak';
      setError(msg);
      setLoading(false);
    }
  }, [effectiveUserId]);

  const loadSupabaseStreakAndSolves = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Fetch streak row
      const { data: streakRow, error: streakErr } = await supabase
        .from('streaks')
        .select('*')
        .eq('user_id', effectiveUserId)
        .maybeSingle();

      if (streakErr) throw streakErr;
      if (streakRow) {
        setStreak(streakRow as Streak);
      }

      // 2. Fetch past 365 days of solved attempts
      const oneYearAgo = new Date();
      oneYearAgo.setDate(oneYearAgo.getDate() - 365);
      const isoOneYearAgo = oneYearAgo.toISOString();

      const { data: attemptsData, error: attErr } = await supabase
        .from('attempts')
        .select(`
          problem_id,
          solved_at,
          problems (
            title,
            difficulty
          )
        `)
        .eq('user_id', effectiveUserId)
        .eq('status', 'solved')
        .gte('solved_at', isoOneYearAgo);

      if (attErr) throw attErr;

      const solves = (attemptsData || []).map((row: unknown) => {
        const item = row as {
          problem_id: string;
          solved_at: string;
          problems?: { title: string; difficulty: ProblemDifficulty };
        };
        return {
          date: item.solved_at.split('T')[0],
          problemId: item.problem_id,
          title: item.problems?.title || 'Problem',
          difficulty: item.problems?.difficulty || 'Medium',
        };
      });

      setRawSolves(solves);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error fetching streak';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [effectiveUserId]);

  const refreshStreak = useCallback(async () => {
    if (isDemo) {
      loadDemoStreakAndSolves();
    } else {
      await loadSupabaseStreakAndSolves();
    }
  }, [isDemo, loadDemoStreakAndSolves, loadSupabaseStreakAndSolves]);

  useEffect(() => {
    if (isDemo) {
      loadDemoStreakAndSolves();
      const unsubStreak = demoStore.subscribe('streaks', loadDemoStreakAndSolves);
      const unsubAttempts = demoStore.subscribe('attempts', loadDemoStreakAndSolves);
      return () => {
        unsubStreak();
        unsubAttempts();
      };
    } else {
      loadSupabaseStreakAndSolves();

      const channel = supabase
        .channel(`streaks-${effectiveUserId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'streaks', filter: `user_id=eq.${effectiveUserId}` },
          () => {
            loadSupabaseStreakAndSolves();
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'attempts', filter: `user_id=eq.${effectiveUserId}` },
          () => {
            loadSupabaseStreakAndSolves();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [isDemo, loadDemoStreakAndSolves, loadSupabaseStreakAndSolves, effectiveUserId]);

  // Compute 52-week activity heatmap
  const heatmapData: HeatmapData = useMemo(() => {
    // Map date -> array of solves
    const dateMap = new Map<
      string,
      { id: string; title: string; difficulty: ProblemDifficulty }[]
    >();

    rawSolves.forEach((s) => {
      const existing = dateMap.get(s.date) || [];
      existing.push({
        id: s.problemId,
        title: s.title,
        difficulty: s.difficulty,
      });
      dateMap.set(s.date, existing);
    });

    const today = new Date();
    // End date is today
    const endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    // We want 52 weeks (Sunday to Saturday, 7 days per week = 364 days + remainder to end on today)
    const dayOfWeek = endDate.getDay(); // 0 is Sunday, 6 is Saturday
    // Aligns the grid cleanly:
    const totalDays = 52 * 7 + (dayOfWeek + 1);

    const startDate = new Date(endDate);
    startDate.setDate(endDate.getDate() - (totalDays - 1));

    const weeks: { week_index: number; days: HeatmapCell[] }[] = [];
    let currentWeekDays: HeatmapCell[] = [];
    let weekIndex = 0;
    let totalSolvesInYear = 0;
    let activeDays = 0;

    const pointer = new Date(startDate);
    while (pointer <= endDate) {
      const dateStr = pointer.toISOString().split('T')[0];
      const items = dateMap.get(dateStr) || [];
      const count = items.length;

      if (count > 0) {
        totalSolvesInYear += count;
        activeDays += 1;
      }

      let level: 0 | 1 | 2 | 3 | 4 = 0;
      if (count === 1) level = 1;
      else if (count === 2) level = 2;
      else if (count === 3) level = 3;
      else if (count >= 4) level = 4;

      currentWeekDays.push({
        date: dateStr,
        count,
        level,
        problems: items,
      });

      if (currentWeekDays.length === 7) {
        weeks.push({
          week_index: weekIndex,
          days: currentWeekDays,
        });
        currentWeekDays = [];
        weekIndex += 1;
      }

      pointer.setDate(pointer.getDate() + 1);
    }

    if (currentWeekDays.length > 0) {
      weeks.push({
        week_index: weekIndex,
        days: currentWeekDays,
      });
    }

    return {
      total_solves_in_year: totalSolvesInYear,
      active_days: activeDays,
      current_streak: streak?.current_streak || 0,
      longest_streak: streak?.longest_streak || 0,
      weeks,
    };
  }, [rawSolves, streak]);

  return {
    streak,
    heatmapData,
    loading,
    error,
    refreshStreak,
  };
}
