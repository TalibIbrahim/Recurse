import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  supabase,
  isSupabaseConfigured,
  isDemoModeActive,
  demoStore,
  DEMO_USER_ID,
} from '../lib/supabase';
import {
  DailyGoal,
  DailyGoalProgress,
  GoalPresetType,
  ProblemDifficulty,
  GoalCadence,
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

  const effectiveUserId = currentUserId || DEMO_USER_ID;
  const isDemo = isDemoModeActive() || !isSupabaseConfigured;

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

  const loadDemoGoalAndSolves = useCallback(() => {
    try {
      const g = demoStore.getDailyGoal(effectiveUserId);
      setGoal(g);

      const todayStr = new Date().toISOString().split('T')[0];
      const mondayIso = getWeekStartIso();

      const userAttempts = demoStore.getAttempts(effectiveUserId);
      const todayAttempts = userAttempts.filter(
        (a) => a.status === 'solved' && a.solved_at.startsWith(todayStr)
      );

      const weeklySolves = userAttempts.filter(
        (a) => a.status === 'solved' && a.solved_at >= mondayIso
      ).length;
      setWeeklySolvesCount(weeklySolves);

      const streak = demoStore.getStreak(effectiveUserId);
      setUserStreakCount(streak.current_streak);

      const companion = demoStore.getAmbientFriendGoal(effectiveUserId);
      setAmbientFriend(companion);

      const diffs: ProblemDifficulty[] = [];
      const probMap = new Map(SEED_PROBLEMS.map((p) => [p.id, p]));

      todayAttempts.forEach((att) => {
        const prob = att.problem || probMap.get(att.problem_id);
        if (prob) {
          diffs.push(prob.difficulty);
        }
      });

      setSolvedDifficulties(diffs);
      setLoading(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load demo goal';
      setError(msg);
      setLoading(false);
    }
  }, [effectiveUserId]);

  const loadSupabaseGoalAndSolves = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const todayStr = new Date().toISOString().split('T')[0];
      const mondayIso = getWeekStartIso();

      // 1. Fetch user's active goal
      const { data: goalData, error: goalErr } = await supabase
        .from('daily_goals')
        .select('*')
        .eq('user_id', effectiveUserId)
        .order('effective_from', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (goalErr) throw goalErr;

      let activeGoal: DailyGoal;
      if (!goalData) {
        const { data: newGoal, error: createErr } = await supabase
          .from('daily_goals')
          .insert({
            user_id: effectiveUserId,
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
        .eq('user_id', effectiveUserId)
        .eq('status', 'solved')
        .gte('solved_at', `${todayStr}T00:00:00Z`);

      if (attErr) throw attErr;

      const diffs: ProblemDifficulty[] = [];
      if (attemptsData) {
        attemptsData.forEach((row: unknown) => {
          const typed = row as { problems?: { difficulty: ProblemDifficulty } };
          if (typed.problems?.difficulty) {
            diffs.push(typed.problems.difficulty);
          }
        });
      }

      setSolvedDifficulties(diffs);

      // 3. Fetch weekly solved count
      const { count: weekCount, error: weekErr } = await supabase
        .from('attempts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', effectiveUserId)
        .eq('status', 'solved')
        .gte('solved_at', mondayIso);

      if (!weekErr && weekCount !== null) {
        setWeeklySolvesCount(weekCount);
      }

      // 4. Fetch streak for endowed momentum
      const { data: streakData } = await supabase
        .from('streaks')
        .select('current_streak')
        .eq('user_id', effectiveUserId)
        .maybeSingle();

      if (streakData) {
        setUserStreakCount(streakData.current_streak);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error fetching daily goal';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [effectiveUserId]);

  const refreshGoal = useCallback(async () => {
    if (isDemo) {
      loadDemoGoalAndSolves();
    } else {
      await loadSupabaseGoalAndSolves();
    }
  }, [isDemo, loadDemoGoalAndSolves, loadSupabaseGoalAndSolves]);

  useEffect(() => {
    if (isDemo) {
      loadDemoGoalAndSolves();
      const unsubGoals = demoStore.subscribe('daily_goals', loadDemoGoalAndSolves);
      const unsubAttempts = demoStore.subscribe('attempts', loadDemoGoalAndSolves);
      const unsubStreaks = demoStore.subscribe('streaks', loadDemoGoalAndSolves);
      return () => {
        unsubGoals();
        unsubAttempts();
        unsubStreaks();
      };
    } else {
      loadSupabaseGoalAndSolves();

      const channel = supabase
        .channel(`daily-goals-${effectiveUserId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'daily_goals', filter: `user_id=eq.${effectiveUserId}` },
          () => {
            loadSupabaseGoalAndSolves();
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'attempts', filter: `user_id=eq.${effectiveUserId}` },
          () => {
            loadSupabaseGoalAndSolves();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [isDemo, loadDemoGoalAndSolves, loadSupabaseGoalAndSolves, effectiveUserId]);

  // Compute Daily progress derived state
  const progress: DailyGoalProgress = useMemo(() => {
    const easyTarget = goal?.easy_target ?? 1;
    const mediumTarget = goal?.medium_target ?? 1;
    const hardTarget = goal?.hard_target ?? 0;

    let easySolved = 0;
    let mediumSolved = 0;
    let hardSolved = 0;

    solvedDifficulties.forEach((diff) => {
      if (diff === 'Easy') easySolved += 1;
      else if (diff === 'Medium') mediumSolved += 1;
      else if (diff === 'Hard') hardSolved += 1;
    });

    const totalSolved = easySolved + mediumSolved + hardSolved;
    const totalTarget = easyTarget + mediumTarget + hardTarget;
    const remainingCount = Math.max(0, totalTarget - totalSolved);
    const rawPercentage = totalTarget > 0 ? (totalSolved / totalTarget) * 100 : 100;
    const percentage = Math.min(100, Math.round(rawPercentage));

    const isComplete =
      easySolved >= easyTarget &&
      mediumSolved >= mediumTarget &&
      hardSolved >= hardTarget;

    return {
      easy_solved: easySolved,
      medium_solved: mediumSolved,
      hard_solved: hardSolved,
      easy_target: easyTarget,
      medium_target: mediumTarget,
      hard_target: hardTarget,
      total_solved: totalSolved,
      total_target: totalTarget,
      remaining_count: remainingCount,
      percentage,
      is_complete: isComplete,
    };
  }, [goal, solvedDifficulties]);

  // Compute Weekly progress derived state with Endowed Progress from Streaks >= 3
  const weeklyProgress: WeeklyGoalProgress = useMemo(() => {
    const targetCount = goal?.weekly_target ?? 10;
    // Endowed progress: +1 momentum credit if consistency streak >= 3 days
    const endowedCount = userStreakCount >= 3 ? 1 : 0;
    const effectiveSolved = weeklySolvesCount + endowedCount;
    const remainingCount = Math.max(0, targetCount - effectiveSolved);

    const now = new Date();
    const dayOfWeek = now.getDay();
    const diffToMonday = (dayOfWeek + 6) % 7;
    const daysRemaining = Math.max(1, 7 - diffToMonday);

    const rawPercentage = targetCount > 0 ? (effectiveSolved / targetCount) * 100 : 100;
    const percentage = Math.min(100, Math.round(rawPercentage));
    const isComplete = effectiveSolved >= targetCount;

    return {
      total_solved: weeklySolvesCount,
      target_count: targetCount,
      endowed_count: endowedCount,
      effective_solved: effectiveSolved,
      remaining_count: remainingCount,
      days_remaining: daysRemaining,
      percentage,
      is_complete: isComplete,
    };
  }, [goal, weeklySolvesCount, userStreakCount]);

  // Compute Dual Goal Progress
  const dualProgress: DualGoalProgress = useMemo(() => {
    const cadence = goal?.cadence || 'both';
    return {
      cadence,
      daily: progress,
      weekly: weeklyProgress,
      is_daily_active: cadence === 'daily' || cadence === 'both',
      is_weekly_active: cadence === 'weekly' || cadence === 'both',
    };
  }, [goal, progress, weeklyProgress]);

  const isGoalMet = useMemo(() => {
    const cadence = goal?.cadence || 'both';
    if (cadence === 'daily') return progress.is_complete;
    if (cadence === 'weekly') return weeklyProgress.is_complete;
    return progress.is_complete || weeklyProgress.is_complete;
  }, [goal, progress, weeklyProgress]);

  const setPreset = async (preset: GoalPresetType) => {
    const config = GOAL_PRESETS.find((p) => p.preset === preset);
    if (!config && preset !== 'Custom') return;

    const easy = config ? config.easy_target : goal?.easy_target ?? 1;
    const medium = config ? config.medium_target : goal?.medium_target ?? 1;
    const hard = config ? config.hard_target : goal?.hard_target ?? 0;
    const cadence = goal?.cadence || 'both';
    const weeklyTarget = goal?.weekly_target || 10;

    if (isDemo) {
      const updated = demoStore.setDailyGoal(
        effectiveUserId,
        preset,
        easy,
        medium,
        hard,
        cadence,
        weeklyTarget
      );
      setGoal(updated);
      return;
    }

    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const { data, error: upsertErr } = await supabase
        .from('daily_goals')
        .upsert(
          {
            user_id: effectiveUserId,
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
    const easy = goal?.easy_target ?? 1;
    const medium = goal?.medium_target ?? 1;
    const hard = goal?.hard_target ?? 0;
    const weeklyTarget = goal?.weekly_target ?? 10;
    const preset = goal?.preset ?? 'Standard';

    if (isDemo) {
      const updated = demoStore.setDailyGoal(
        effectiveUserId,
        preset,
        easy,
        medium,
        hard,
        cadence,
        weeklyTarget
      );
      setGoal(updated);
      return;
    }

    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const { data, error: upsertErr } = await supabase
        .from('daily_goals')
        .upsert(
          {
            user_id: effectiveUserId,
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

  const setWeeklyTarget = async (weeklyTarget: number) => {
    const safeTarget = Math.max(1, Math.min(50, Math.floor(weeklyTarget)));
    const easy = goal?.easy_target ?? 1;
    const medium = goal?.medium_target ?? 1;
    const hard = goal?.hard_target ?? 0;
    const cadence = goal?.cadence ?? 'both';
    const preset = goal?.preset ?? 'Standard';

    if (isDemo) {
      const updated = demoStore.setDailyGoal(
        effectiveUserId,
        preset,
        easy,
        medium,
        hard,
        cadence,
        safeTarget
      );
      setGoal(updated);
      return;
    }

    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const { data, error: upsertErr } = await supabase
        .from('daily_goals')
        .upsert(
          {
            user_id: effectiveUserId,
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
    weeklyTarget: number = goal?.weekly_target ?? 10,
    cadence: GoalCadence = goal?.cadence ?? 'both'
  ) => {
    const safeEasy = Math.max(0, Math.floor(easy));
    const safeMedium = Math.max(0, Math.floor(medium));
    const safeHard = Math.max(0, Math.floor(hard));
    const safeWeekly = Math.max(1, Math.floor(weeklyTarget));

    if (isDemo) {
      const updated = demoStore.setDailyGoal(
        effectiveUserId,
        'Custom',
        safeEasy,
        safeMedium,
        safeHard,
        cadence,
        safeWeekly
      );
      setGoal(updated);
      return;
    }

    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const { data, error: upsertErr } = await supabase
        .from('daily_goals')
        .upsert(
          {
            user_id: effectiveUserId,
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
    refreshGoal,
  };
}
