import { useState, useEffect, useCallback } from 'react';
import {
  supabase,
  isSupabaseConfigured,
  isDemoModeActive,
  demoStore,
  DEMO_USER_ID,
} from '../lib/supabase';
import { Attempt, LogAttemptInput } from '../data/types';
import { SEED_PROBLEMS } from '../data/problemsSeed';

export interface UseAttemptsReturn {
  readonly attempts: readonly Attempt[];
  readonly friendAttempts: readonly Attempt[];
  readonly loading: boolean;
  readonly error: string | null;
  readonly logAttempt: (input: LogAttemptInput) => Promise<{ success: boolean; attempt?: Attempt; error?: string }>;
  readonly updateAttempt: (
    attemptId: string,
    updates: Partial<LogAttemptInput>
  ) => Promise<{ success: boolean; error?: string }>;
  readonly deleteAttempt: (attemptId: string) => Promise<{ success: boolean; error?: string }>;
  readonly getAttemptForProblem: (problemId: string) => Attempt | undefined;
  readonly refreshAttempts: () => Promise<void>;
}

export function useAttempts(currentUserId?: string): UseAttemptsReturn {
  const [attempts, setAttempts] = useState<readonly Attempt[]>([]);
  const [friendAttempts, setFriendAttempts] = useState<readonly Attempt[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const effectiveUserId = currentUserId || DEMO_USER_ID;
  const isDemo = isDemoModeActive() || !isSupabaseConfigured;

  const loadDemoAttempts = useCallback(() => {
    try {
      const own = demoStore.getAttempts(effectiveUserId);
      const friends = demoStore.getFriendAttempts(effectiveUserId);
      setAttempts(own);
      setFriendAttempts(friends);
      setLoading(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load demo attempts';
      setError(msg);
      setLoading(false);
    }
  }, [effectiveUserId]);

  const loadSupabaseAttempts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Fetch own attempts
      const { data: ownData, error: ownErr } = await supabase
        .from('attempts')
        .select(`
          *,
          problem:problems(*),
          user:profiles(*)
        `)
        .eq('user_id', effectiveUserId)
        .order('solved_at', { ascending: false });

      if (ownErr) throw ownErr;

      // 2. Fetch friends' attempts (RLS allows select if friendship is accepted)
      const { data: friendData, error: friendErr } = await supabase
        .from('attempts')
        .select(`
          *,
          problem:problems(*),
          user:profiles(*)
        `)
        .neq('user_id', effectiveUserId)
        .order('solved_at', { ascending: false })
        .limit(30);

      if (friendErr) throw friendErr;

      setAttempts((ownData as Attempt[]) || []);
      setFriendAttempts((friendData as Attempt[]) || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error fetching attempts';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [effectiveUserId]);

  const refreshAttempts = useCallback(async () => {
    if (isDemo) {
      loadDemoAttempts();
    } else {
      await loadSupabaseAttempts();
    }
  }, [isDemo, loadDemoAttempts, loadSupabaseAttempts]);

  useEffect(() => {
    if (isDemo) {
      loadDemoAttempts();
      const unsub = demoStore.subscribe('attempts', loadDemoAttempts);
      return unsub;
    } else {
      loadSupabaseAttempts();

      const channel = supabase
        .channel(`attempts-stream-${effectiveUserId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'attempts' },
          () => {
            loadSupabaseAttempts();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [isDemo, loadDemoAttempts, loadSupabaseAttempts, effectiveUserId]);

  const logAttempt = async (
    input: LogAttemptInput
  ): Promise<{ success: boolean; attempt?: Attempt; error?: string }> => {
    if (isDemo) {
      const newAtt = demoStore.addAttempt(effectiveUserId, input);
      return { success: true, attempt: newAtt };
    }

    try {
      const { data, error: insertErr } = await supabase
        .from('attempts')
        .insert({
          user_id: effectiveUserId,
          problem_id: input.problem_id,
          status: input.status,
          approach_notes: input.approach_notes || '',
          pattern_tag: input.pattern_tag || null,
          time_complexity: input.time_complexity || null,
          space_complexity: input.space_complexity || null,
          time_spent_min: input.time_spent_min ?? null,
          submission_url: input.submission_url || null,
          needs_revisit: input.needs_revisit ?? (input.status === 'needs_review'),
          confidence_rating: input.confidence_rating ?? null,
          solved_at: new Date().toISOString(),
        })
        .select(`
          *,
          problem:problems(*),
          user:profiles(*)
        `)
        .single();

      if (insertErr) throw insertErr;

      await refreshAttempts();
      return { success: true, attempt: data as Attempt };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to record attempt';
      return { success: false, error: msg };
    }
  };

  const updateAttempt = async (
    attemptId: string,
    updates: Partial<LogAttemptInput>
  ): Promise<{ success: boolean; error?: string }> => {
    if (isDemo) {
      demoStore.updateAttempt(attemptId, updates);
      return { success: true };
    }

    try {
      const { error: updateErr } = await supabase
        .from('attempts')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', attemptId)
        .eq('user_id', effectiveUserId);

      if (updateErr) throw updateErr;
      await refreshAttempts();
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update attempt';
      return { success: false, error: msg };
    }
  };

  const deleteAttempt = async (attemptId: string): Promise<{ success: boolean; error?: string }> => {
    if (isDemo) {
      demoStore.deleteAttempt(attemptId);
      return { success: true };
    }

    try {
      const { error: delErr } = await supabase
        .from('attempts')
        .delete()
        .eq('id', attemptId)
        .eq('user_id', effectiveUserId);

      if (delErr) throw delErr;
      await refreshAttempts();
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete attempt';
      return { success: false, error: msg };
    }
  };

  const getAttemptForProblem = (problemId: string): Attempt | undefined => {
    return attempts.find((a) => a.problem_id === problemId || a.problem?.id === problemId);
  };

  return {
    attempts,
    friendAttempts,
    loading,
    error,
    logAttempt,
    updateAttempt,
    deleteAttempt,
    getAttemptForProblem,
    refreshAttempts,
  };
}
