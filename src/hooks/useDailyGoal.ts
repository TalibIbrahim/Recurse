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
import { GOAL_PRESETS, SEED_PROBLEMS } from '../data/problemsSeed';

export interface AmbientFriendInfo {
  readonly friend: Profile;
  readonly solved_today: number;
  readonly daily_target: number;
  readonly current_streak: number;
  readonly is_complete: boolean;
  readonly weekly_solved: number;
  readonly weekly_target: number;
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
  readonly setPreset: (preset: GoalPresetType) => Promise<void>;
  readonly setCadence: (cadence: GoalCadence) => Promise<void>;
  readonly setWeeklyTarget: (target: number) => Promise<void>;
  readonly updateCustomGoal: (
    easy: number,
    medium: number,
    hard: number,
    weeklyTarget?: number,
    cadence?: GoalCadence
  ) => Promise<void>;
  readonly refreshGoal: () => Promise<void>;
}

export function useDailyGoal(currentUserId?: string): UseDailyGoalReturn {
  const [goal, setGoal] = useState<DailyGoal | null>(null);
  const [solvedDifficulties, setSolvedDifficulties] = useState<readonly ProblemDifficulty[]>([]);
  const [weeklySolvesCount, setWeeklySolvesCount] = useState<number>(0);
  const [ambientFriend, setAmbientFriend] = useState<AmbientFriendInfo | null>(null);
  const [userStreakCount, setUserStreakCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Calculate start of current week (Monday 00:00:00)
  const getWeekStartIso = () => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diffToMonday = (dayOfWeek + 6) % 7;
    const monday = new Date(now);
    monday.setDate(now.getDate() - diffToMonday);
    monday.setHours(0, 0, 0, 0);
    return monday.toISOString();
  };

  const loadSupabaseGoalAndSolves = useCallback(async () => {
    if (!currentUserId) {
      setGoal(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const todayStr = new Date().toISOString().split('T')[0];
      const mondayIso = getWeekStartIso();

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
        const { data: newGoal, error: createErr } = await supabase
          .from('daily_goals')
          .insert({
            user_id: currentUserId,
            preset: 'Standard',
            cadence: 'both',
            easy_target: 1,
            medium_target: 1,
            hard_target: 0,
            weekly_target: 10,
            effective_from: todayStr,
          })
          .select('*')
          .single();

        if (createErr) throw createErr;
        activeGoal = newGoal as DailyGoal;
      } else {
        activeGoal = goalData as DailyGoal;
      }

      setGoal(activeGoal);

      // 2. Fetch today's solved attempts
      const { data: attemptsData, error: attErr } = await supabase
        .from('attempts')
        .select('problem_id, problems(difficulty)')
        .eq('user_id', currentUserId)
        .eq('status', 'solved')
        .gte('solved_at', `${todayStr}T00:00:00Z`);

      if (attErr) throw attErr;

      const diffs: ProblemDifficulty[] = [];
      const probMap = new Map(SEED_PROBLEMS.map((p) => [p.id, p]));

      if (attemptsData) {
        attemptsData.forEach((row: unknown) => {
          const typed = row as { problem_id?: string; problems?: { difficulty: ProblemDifficulty } };
          if (typed.problems?.difficulty) {
            diffs.push(typed.problems.difficulty);
          } else if (typed.problem_id) {
            const fb = probMap.get(typed.problem_id) || SEED_PROBLEMS.find((p) => p.leetcode_slug === typed.problem_id);
            if (fb) diffs.push(fb.difficulty);
          }
        });
      }

      setSolvedDifficulties(diffs);

      // 3. Fetch weekly solved count
      const { count: weekCount, error: weekErr } = await supabase
        .from('attempts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', currentUserId)
        .eq('status', 'solved')
        .gte('solved_at', mondayIso);

      if (!weekErr && weekCount !== null) {
        setWeeklySolvesCount(weekCount);
      }

      // 4. Fetch streak for endowed momentum
      const { data: streakData } = await supabase
        .from('streaks')
        .select('current_streak')
        .eq('user_id', currentUserId)
        .maybeSingle();

      if (streakData) {
        setUserStreakCount(streakData.current_streak);
      }

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
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [currentUserId, loadSupabaseGoalAndSolves]);

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

    const easyMet = easyS >= easyT;
    const medMet = medS >= medT;
    const hardMet = hardS >= hardT;
    const isComplete = easyMet && medMet && hardMet && totalT > 0;

    const pct = totalT > 0 ? Math.min(100, Math.round((totalS / totalT) * 100)) : 0;
    const remainingCount = Math.max(0, totalT - totalS);

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
    const now = new Date();
    const dayOfWeek = now.getDay();
    const daysLeft = (7 - (dayOfWeek === 0 ? 7 : dayOfWeek) + 1) % 7;

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
    return {
      cadence: goal?.cadence ?? 'both',
      daily: progress,
      weekly: weeklyProgress,
      is_daily_active: goal?.cadence === 'daily' || goal?.cadence === 'both',
      is_weekly_active: goal?.cadence === 'weekly' || goal?.cadence === 'both',
    };
  }, [goal, progress, weeklyProgress]);

  const isGoalMet = useMemo<boolean>(() => {
    const c = goal?.cadence ?? 'both';
    if (c === 'daily') return progress.is_complete;
    if (c === 'weekly') return weeklyProgress.is_complete;
    return progress.is_complete && weeklyProgress.is_complete;
  }, [goal, progress, weeklyProgress]);

  const setPreset = async (preset: GoalPresetType) => {
    if (!currentUserId) return;
    const config = GOAL_PRESETS.find((p) => p.preset === preset);
    if (!config && preset !== 'Custom') return;

    const easy = config ? config.easy_target : goal?.easy_target ?? 1;
    const medium = config ? config.medium_target : goal?.medium_target ?? 1;
    const hard = config ? config.hard_target : goal?.hard_target ?? 0;
    const cadence = goal?.cadence || 'both';
    const weeklyTarget = goal?.weekly_target || 10;

    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const { data, error: upsertErr } = await supabase
        .from('daily_goals')
        .upsert(
          {
            user_id: currentUserId,
            preset,
            cadence,
            easy_target: easy,
            medium_target: medium,
            hard_target: hard,
            weekly_target: weeklyTarget,
            effective_from: todayStr,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,effective_from' }
        )
        .select('*')
        .single();

      if (upsertErr) throw upsertErr;
      if (data) setGoal(data as DailyGoal);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update goal preset';
      setError(msg);
    }
  };

  const setCadence = async (cadence: GoalCadence) => {
    if (!currentUserId) return;
    const easy = goal?.easy_target ?? 1;
    const medium = goal?.medium_target ?? 1;
    const hard = goal?.hard_target ?? 0;
    const weeklyTarget = goal?.weekly_target ?? 10;
    const preset = goal?.preset ?? 'Standard';

    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const { data, error: upsertErr } = await supabase
        .from('daily_goals')
        .upsert(
          {
            user_id: currentUserId,
            preset,
            cadence,
            easy_target: easy,
            medium_target: medium,
            hard_target: hard,
            weekly_target: weeklyTarget,
            effective_from: todayStr,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,effective_from' }
        )
        .select('*')
        .single();

      if (upsertErr) throw upsertErr;
      if (data) setGoal(data as DailyGoal);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update goal cadence';
      setError(msg);
    }
  };

  const setWeeklyTarget = async (target: number) => {
    if (!currentUserId) return;
    const safeTarget = Math.max(1, target);
    const easy = goal?.easy_target ?? 1;
    const medium = goal?.medium_target ?? 1;
    const hard = goal?.hard_target ?? 0;
    const cadence = goal?.cadence ?? 'both';
    const preset = goal?.preset ?? 'Standard';

    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const { data, error: upsertErr } = await supabase
        .from('daily_goals')
        .upsert(
          {
            user_id: currentUserId,
            preset,
            cadence,
            easy_target: easy,
            medium_target: medium,
            hard_target: hard,
            weekly_target: safeTarget,
            effective_from: todayStr,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,effective_from' }
        )
        .select('*')
        .single();

      if (upsertErr) throw upsertErr;
      if (data) setGoal(data as DailyGoal);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update weekly target';
      setError(msg);
    }
  };

  const updateCustomGoal = async (
    easy: number,
    medium: number,
    hard: number,
    weeklyTarget: number = 10,
    cadence: GoalCadence = 'both'
  ) => {
    if (!currentUserId) return;
    const safeEasy = Math.max(0, easy);
    const safeMedium = Math.max(0, medium);
    const safeHard = Math.max(0, hard);
    const safeWeekly = Math.max(1, weeklyTarget);

    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const { data, error: upsertErr } = await supabase
        .from('daily_goals')
        .upsert(
          {
            user_id: currentUserId,
            preset: 'Custom',
            cadence,
            easy_target: safeEasy,
            medium_target: safeMedium,
            hard_target: safeHard,
            weekly_target: safeWeekly,
            effective_from: todayStr,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,effective_from' }
        )
        .select('*')
        .single();

      if (upsertErr) throw upsertErr;
      if (data) setGoal(data as DailyGoal);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update custom goal';
      setError(msg);
    }
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
