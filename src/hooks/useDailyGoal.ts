import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import {
  DailyGoal,
  DailyGoalProgress,
  GoalPresetType,
  GoalCadence,
  ProblemDifficulty,
  WeeklyGoalProgress,
  DualGoalProgress,
  Profile,
} from '../data/types';
import { GOAL_PRESETS } from '../data/problemsSeed';
import { hydrateAttempts, effectiveStreak, startOfLocalDayIso, startOfLocalWeekIso, localDateKey } from '../lib/problems';
import { useDataRefresh, writeWithColumnFallback } from '../lib/dataSync';

export interface AmbientFriendInfo {
  readonly friend: Profile;
  readonly solved_today: number;
  readonly daily_target: number;
  readonly current_streak: number;
  readonly is_complete: boolean;
  readonly weekly_solved: number;
  readonly weekly_target: number;
}

export interface GoalSaveResult {
  readonly success: boolean;
  readonly error?: string;
}

export interface UseDailyGoalReturn {
  readonly goal: DailyGoal | null;
  readonly preset: GoalPresetType;
  readonly cadence: GoalCadence;
  readonly progress: DailyGoalProgress;
  readonly weeklyProgress: WeeklyGoalProgress;
  readonly dualProgress: DualGoalProgress;
  readonly ambientFriend: AmbientFriendInfo | null;
  readonly isGoalMet: boolean;
  readonly loading: boolean;
  readonly error: string | null;
  readonly setPreset: (preset: GoalPresetType) => Promise<GoalSaveResult>;
  readonly setCadence: (cadence: GoalCadence) => Promise<GoalSaveResult>;
  readonly setWeeklyTarget: (target: number) => Promise<GoalSaveResult>;
  readonly updateCustomGoal: (
    easy: number,
    medium: number,
    hard: number,
    weeklyTarget?: number,
    cadence?: GoalCadence,
    preset?: GoalPresetType
  ) => Promise<GoalSaveResult>;
  readonly refreshGoal: () => Promise<void>;
}

interface GoalFields {
  readonly preset: GoalPresetType;
  readonly cadence: GoalCadence;
  readonly easy_target: number;
  readonly medium_target: number;
  readonly hard_target: number;
  readonly weekly_target: number;
}

export function useDailyGoal(currentUserId?: string): UseDailyGoalReturn {
  const [goal, setGoal] = useState<DailyGoal | null>(null);
  const [solvedDifficulties, setSolvedDifficulties] = useState<readonly ProblemDifficulty[]>([]);
  const [weeklySolvesCount, setWeeklySolvesCount] = useState<number>(0);
  const [ambientFriend, setAmbientFriend] = useState<AmbientFriendInfo | null>(null);
  const [userStreakCount, setUserStreakCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadSupabaseGoalAndSolves = useCallback(async () => {
    if (!currentUserId) {
      setGoal(null);
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const mondayIso = startOfLocalWeekIso();
      const todayStartIso = startOfLocalDayIso();

      // 1. Fetch user's active goal
      const { data: goalData, error: goalErr } = await supabase
        .from('daily_goals')
        .select('*')
        .eq('user_id', currentUserId)
        .order('effective_from', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (goalErr) throw goalErr;

      let activeGoal: DailyGoal;
      if (!goalData) {
        const { data: newGoal, error: createErr } = await writeWithColumnFallback<DailyGoal>(
          {
            user_id: currentUserId,
            preset: 'Standard',
            cadence: 'both',
            easy_target: 1,
            medium_target: 1,
            hard_target: 0,
            weekly_target: 10,
            effective_from: localDateKey(),
          },
          (body) => supabase.from('daily_goals').insert(body).select('*').single()
        );

        if (createErr) throw createErr;
        activeGoal = newGoal as DailyGoal;
      } else {
        activeGoal = goalData as DailyGoal;
      }

      setGoal(activeGoal);

      // 2. Fetch this week's solved attempts (today's are a subset)
      const { data: weekRows, error: attErr } = await supabase
        .from('attempts')
        .select('*')
        .eq('user_id', currentUserId)
        .eq('status', 'solved')
        .gte('solved_at', mondayIso);

      if (attErr) throw attErr;

      const weekSolves = hydrateAttempts(weekRows);
      const todayStartMs = new Date(todayStartIso).getTime();
      setWeeklySolvesCount(weekSolves.length);
      setSolvedDifficulties(
        weekSolves
          .filter((a) => new Date(a.solved_at).getTime() >= todayStartMs)
          .map((a) => a.problem!.difficulty)
      );

      // 3. Fetch streak for endowed momentum
      const { data: streakData } = await supabase
        .from('streaks')
        .select('current_streak, last_active_date')
        .eq('user_id', currentUserId)
        .maybeSingle();

      setUserStreakCount(effectiveStreak(streakData?.current_streak, streakData?.last_active_date));

      setAmbientFriend(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error fetching daily goal';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    loadSupabaseGoalAndSolves();

    if (currentUserId) {
      const channel = supabase
        .channel(`daily-goals-${currentUserId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'daily_goals', filter: `user_id=eq.${currentUserId}` },
          () => {
            loadSupabaseGoalAndSolves();
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'attempts', filter: `user_id=eq.${currentUserId}` },
          () => {
            loadSupabaseGoalAndSolves();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [currentUserId, loadSupabaseGoalAndSolves]);

  useDataRefresh(loadSupabaseGoalAndSolves, Boolean(currentUserId));

  // Derived daily metrics
  const progress = useMemo<DailyGoalProgress>(() => {
    const easyT = goal?.easy_target ?? 1;
    const medT = goal?.medium_target ?? 1;
    const hardT = goal?.hard_target ?? 0;

    const easyS = solvedDifficulties.filter((d) => d === 'Easy').length;
    const medS = solvedDifficulties.filter((d) => d === 'Medium').length;
    const hardS = solvedDifficulties.filter((d) => d === 'Hard').length;

    const totalT = easyT + medT + hardT;
    const totalS = easyS + medS + hardS;
    // Extra solves of one difficulty don't close another difficulty's ring.
    const countedS = Math.min(easyS, easyT) + Math.min(medS, medT) + Math.min(hardS, hardT);

    const easyMet = easyS >= easyT;
    const medMet = medS >= medT;
    const hardMet = hardS >= hardT;
    const isComplete = easyMet && medMet && hardMet && totalT > 0;

    const pct = totalT > 0 ? Math.min(100, Math.round((countedS / totalT) * 100)) : 0;
    const remainingCount = Math.max(0, totalT - countedS);

    return {
      easy_target: easyT,
      medium_target: medT,
      hard_target: hardT,
      total_target: totalT,
      easy_solved: easyS,
      medium_solved: medS,
      hard_solved: hardS,
      total_solved: totalS,
      easy_met: easyMet,
      medium_met: medMet,
      hard_met: hardMet,
      is_complete: isComplete,
      percentage: pct,
      remaining_count: remainingCount,
    };
  }, [goal, solvedDifficulties]);

  // Derived weekly stretch metrics
  const weeklyProgress = useMemo<WeeklyGoalProgress>(() => {
    const weeklyTarget = goal?.weekly_target ?? 10;
    // Days left in the Mon–Sun week, counting today (Mon = 7, Sun = 1).
    const isoDay = new Date().getDay() || 7;
    const daysLeft = 8 - isoDay;

    const hasEndowedMomentum = userStreakCount >= 3;
    const endowedCredit = hasEndowedMomentum ? 1 : 0;
    const effectiveWeeklySolved = weeklySolvesCount + endowedCredit;

    const remainingCount = Math.max(0, weeklyTarget - effectiveWeeklySolved);
    const isComplete = effectiveWeeklySolved >= weeklyTarget && weeklyTarget > 0;
    const pct = weeklyTarget > 0 ? Math.min(100, Math.round((effectiveWeeklySolved / weeklyTarget) * 100)) : 0;

    return {
      total_solved: weeklySolvesCount,
      target_count: weeklyTarget,
      endowed_count: endowedCredit,
      effective_solved: effectiveWeeklySolved,
      remaining_count: remainingCount,
      days_remaining: daysLeft,
      percentage: pct,
      is_complete: isComplete,
    };
  }, [goal, weeklySolvesCount, userStreakCount]);

  // Dual goal synthesis
  const dualProgress = useMemo<DualGoalProgress>(() => {
    const c = goal?.cadence ?? 'both';
    return {
      cadence: c,
      daily: progress,
      weekly: weeklyProgress,
      is_daily_active: c === 'daily' || c === 'both',
      is_weekly_active: c === 'weekly' || c === 'both',
    };
  }, [goal, progress, weeklyProgress]);

  const isGoalMet = useMemo<boolean>(() => {
    const c = goal?.cadence ?? 'both';
    if (c === 'daily') return progress.is_complete;
    if (c === 'weekly') return weeklyProgress.is_complete;
    return progress.is_complete && weeklyProgress.is_complete;
  }, [goal, progress, weeklyProgress]);

  const currentFields = (): GoalFields => ({
    preset: goal?.preset ?? 'Standard',
    cadence: goal?.cadence ?? 'both',
    easy_target: goal?.easy_target ?? 1,
    medium_target: goal?.medium_target ?? 1,
    hard_target: goal?.hard_target ?? 0,
    weekly_target: goal?.weekly_target ?? 10,
  });

  const saveGoal = async (fields: GoalFields): Promise<GoalSaveResult> => {
    if (!currentUserId) return { success: false, error: 'You are not signed in.' };

    const { data, error: upsertErr } = await writeWithColumnFallback<DailyGoal>(
      {
        user_id: currentUserId,
        ...fields,
        effective_from: localDateKey(),
        updated_at: new Date().toISOString(),
      },
      (body) =>
        supabase
          .from('daily_goals')
          .upsert(body, { onConflict: 'user_id,effective_from' })
          .select('*')
          .single()
    );

    if (upsertErr) {
      setError(upsertErr.message);
      return { success: false, error: upsertErr.message };
    }
    if (data) {
      // Keep the requested values locally even if the DB dropped newer columns.
      setGoal({ ...fields, ...(data as DailyGoal) });
    }
    return { success: true };
  };

  const setPreset = async (preset: GoalPresetType) => {
    const config = GOAL_PRESETS.find((p) => p.preset === preset);
    const base = currentFields();
    return saveGoal({
      ...base,
      preset,
      ...(config && preset !== 'Custom'
        ? {
            easy_target: config.easy_target,
            medium_target: config.medium_target,
            hard_target: config.hard_target,
          }
        : {}),
    });
  };

  const setCadence = async (cadence: GoalCadence) => saveGoal({ ...currentFields(), cadence });

  const setWeeklyTarget = async (target: number) =>
    saveGoal({ ...currentFields(), weekly_target: Math.max(1, target) });

  const updateCustomGoal = async (
    easy: number,
    medium: number,
    hard: number,
    weeklyTarget: number = 10,
    cadence: GoalCadence = 'both',
    preset: GoalPresetType = 'Custom'
  ) => {
    // A preset only applies if its exact targets are kept; any tweak makes it Custom.
    const config = GOAL_PRESETS.find((p) => p.preset === preset);
    const matchesPreset =
      config &&
      preset !== 'Custom' &&
      config.easy_target === easy &&
      config.medium_target === medium &&
      config.hard_target === hard;

    return saveGoal({
      preset: matchesPreset ? preset : 'Custom',
      cadence,
      easy_target: Math.max(0, easy),
      medium_target: Math.max(0, medium),
      hard_target: Math.max(0, hard),
      weekly_target: Math.max(1, weeklyTarget),
    });
  };

  return {
    goal,
    preset: goal?.preset ?? 'Standard',
    cadence: goal?.cadence ?? 'both',
    progress,
    weeklyProgress,
    dualProgress,
    ambientFriend,
    isGoalMet,
    loading,
    error,
    setPreset,
    setCadence,
    setWeeklyTarget,
    updateCustomGoal,
    refreshGoal: loadSupabaseGoalAndSolves,
  };
}

export default useDailyGoal;
