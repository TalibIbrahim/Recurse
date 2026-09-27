import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
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

  const loadSupabaseStreakAndSolves = useCallback(async () => {
    if (!currentUserId) {
      setStreak(null);
      setRawSolves([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // 1. Fetch streak row
      const { data: streakRow, error: streakErr } = await supabase
        .from('streaks')
        .select('*')
        .eq('user_id', currentUserId)
        .maybeSingle();

      if (streakErr) throw streakErr;

      if (streakRow) {
        setStreak(streakRow as Streak);
      } else {
        const initialStreak: Streak = {
          user_id: currentUserId,
          current_streak: 0,
          longest_streak: 0,
          freezes_available: 2,
          freezes_used: 0,
          is_at_risk: false,
          last_active_date: null,
          updated_at: new Date().toISOString(),
        };
        await supabase.from('streaks').upsert(initialStreak);
        setStreak(initialStreak);
      }

      // 2. Fetch solved attempts
      const { data: attemptsRows, error: attErr } = await supabase
        .from('attempts')
        .select('problem_id, solved_at, problems(title, difficulty)')
        .eq('user_id', currentUserId)
        .eq('status', 'solved');

      if (attErr) throw attErr;

      const probMap = new Map(SEED_PROBLEMS.map((p) => [p.id, p]));
      const solves = (attemptsRows || []).map((row: unknown) => {
        const r = row as {
          problem_id: string;
          solved_at: string;
          problems?: { title: string; difficulty: ProblemDifficulty };
        };
        const fallbackProb = probMap.get(r.problem_id);
        return {
          date: r.solved_at.split('T')[0],
          problemId: r.problem_id,
          title: r.problems?.title || fallbackProb?.title || 'Problem',
          difficulty: r.problems?.difficulty || fallbackProb?.difficulty || 'Medium',
        };
      });

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

    const weeks: { week_index: number; days: HeatmapCell[] }[] = [];
    const today = new Date();
    let totalSolvesInPeriod = 0;

    for (let w = 0; w < 52; w++) {
      const days: HeatmapCell[] = [];
      for (let d = 0; d < 7; d++) {
        const dayOffset = (51 - w) * 7 + (6 - d);
        const dateObj = new Date(today);
        dateObj.setDate(dateObj.getDate() - dayOffset);
        const dateStr = dateObj.toISOString().split('T')[0];

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
