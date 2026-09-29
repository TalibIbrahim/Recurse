import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Streak, HeatmapData, HeatmapCell, ProblemDifficulty } from '../data/types';
import { hydrateAttempts, localDateKey, effectiveStreak, startOfLocalWeekIso } from '../lib/problems';
import { useDataRefresh } from '../lib/dataSync';

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

  const loadSupabaseStreakAndSolves = useCallback(async () => {
    if (!currentUserId) {
      setStreak(null);
      setRawSolves([]);
      setLoading(false);
      return;
    }

    try {
      setError(null);

      // 1. Fetch streak row
      const { data: streakRow, error: streakErr } = await supabase
        .from('streaks')
        .select('*')
        .eq('user_id', currentUserId)
        .maybeSingle();

      if (streakErr) throw streakErr;

      // 2. Fetch solved attempts
      const { data: attemptsRows, error: attErr } = await supabase
        .from('attempts')
        .select('*')
        .eq('user_id', currentUserId)
        .eq('status', 'solved');

      if (attErr) throw attErr;

      const solves = hydrateAttempts(attemptsRows).map((a) => ({
        date: localDateKey(a.solved_at),
        problemId: a.problem_id,
        title: a.problem!.title,
        difficulty: a.problem!.difficulty,
      }));
      const solvedToday = solves.some((s) => s.date === localDateKey());

      if (streakRow) {
        const row = streakRow as Partial<Streak> & { current_streak: number; longest_streak: number };
        const current = effectiveStreak(row.current_streak, row.last_active_date);
        setStreak({
          user_id: currentUserId,
          current_streak: current,
          longest_streak: Math.max(row.longest_streak ?? 0, current),
          last_active_date: row.last_active_date ?? null,
          freezes_available: row.freezes_available ?? 2,
          freezes_used: row.freezes_used ?? 0,
          last_freeze_date: row.last_freeze_date ?? null,
          is_at_risk: current > 0 && !solvedToday,
          updated_at: row.updated_at ?? new Date().toISOString(),
        });
      } else {
        await supabase
          .from('streaks')
          .upsert({ user_id: currentUserId, current_streak: 0, longest_streak: 0 });
        setStreak({
          user_id: currentUserId,
          current_streak: 0,
          longest_streak: 0,
          freezes_available: 2,
          freezes_used: 0,
          is_at_risk: false,
          last_active_date: null,
          updated_at: new Date().toISOString(),
        });
      }

      setRawSolves(solves);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load streak';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    loadSupabaseStreakAndSolves();

    if (currentUserId) {
      const channel = supabase
        .channel(`streak-${currentUserId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'streaks', filter: `user_id=eq.${currentUserId}` },
          () => {
            loadSupabaseStreakAndSolves();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [currentUserId, loadSupabaseStreakAndSolves]);

  useDataRefresh(loadSupabaseStreakAndSolves, Boolean(currentUserId));

  // Construct 52-week heatmap data from solves
  const heatmapData = useMemo<HeatmapData>(() => {
    const solvesByDate = new Map<
      string,
      { count: number; problems: { id: string; title: string; difficulty: ProblemDifficulty }[] }
    >();

    rawSolves.forEach((s) => {
      const existing = solvesByDate.get(s.date) || { count: 0, problems: [] };
      existing.count += 1;
      existing.problems.push({
        id: s.problemId,
        title: s.title,
        difficulty: s.difficulty,
      });
      solvesByDate.set(s.date, existing);
    });

    // 52 Monday-to-Sunday columns ending with the current week, so each row is a
    // fixed weekday. Days after today are included (as empty) to keep rows aligned.
    const weeks: { week_index: number; days: HeatmapCell[] }[] = [];
    const firstMonday = new Date(startOfLocalWeekIso());
    firstMonday.setDate(firstMonday.getDate() - 51 * 7);
    let totalSolvesInPeriod = 0;

    for (let w = 0; w < 52; w++) {
      const days: HeatmapCell[] = [];
      for (let d = 0; d < 7; d++) {
        const dateObj = new Date(firstMonday);
        dateObj.setDate(firstMonday.getDate() + w * 7 + d);
        const dateStr = localDateKey(dateObj);

        const entry = solvesByDate.get(dateStr);
        const count = entry ? entry.count : 0;
        totalSolvesInPeriod += count;

        let level: 0 | 1 | 2 | 3 | 4 = 0;
        if (count === 1) level = 1;
        else if (count === 2) level = 2;
        else if (count === 3) level = 3;
        else if (count >= 4) level = 4;

        days.push({
          date: dateStr,
          count,
          level,
          problems: entry ? entry.problems : [],
        });
      }
      weeks.push({
        week_index: w,
        days,
      });
    }

    return {
      total_solves_in_year: totalSolvesInPeriod,
      active_days: solvesByDate.size,
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
    refreshStreak: loadSupabaseStreakAndSolves,
  };
}

export default useStreak;
