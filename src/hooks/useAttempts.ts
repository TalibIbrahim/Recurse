import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Attempt, LogAttemptInput } from '../data/types';

export interface UseAttemptsReturn {
  readonly attempts: readonly Attempt[];
  readonly friendAttempts: readonly Attempt[];
  readonly loading: boolean;
  readonly error: string | null;
  readonly logAttempt: (
    input: LogAttemptInput
  ) => Promise<{ success: boolean; attempt?: Attempt; error?: string }>;
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

  const loadSupabaseAttempts = useCallback(async () => {
    if (!currentUserId) {
      setAttempts([]);
      setFriendAttempts([]);
      setLoading(false);
      return;
    }

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
        .eq('user_id', currentUserId)
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
        .neq('user_id', currentUserId)
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
  }, [currentUserId]);

  useEffect(() => {
    loadSupabaseAttempts();

    if (currentUserId) {
      const channel = supabase
        .channel(`attempts-stream-${currentUserId}`)
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
  }, [loadSupabaseAttempts, currentUserId]);

  const logAttempt = async (
    input: LogAttemptInput
  ): Promise<{ success: boolean; attempt?: Attempt; error?: string }> => {
    if (!currentUserId) {
      return { success: false, error: 'User is not logged in' };
    }

    try {
      const { data, error: insertErr } = await supabase
        .from('attempts')
        .insert({
          user_id: currentUserId,
          problem_id: input.problem_id,
          status: input.status,
          confidence_rating: input.confidence_rating,
          time_spent_min: input.time_spent_min,
          approach_notes: input.approach_notes,
          pattern_tag: input.pattern_tag,
          time_complexity: input.time_complexity,
          space_complexity: input.space_complexity,
          solved_at: new Date().toISOString(),
        })
        .select(`
          *,
          problem:problems(*),
          user:profiles(*)
        `)
        .single();

      if (insertErr) throw insertErr;

      await loadSupabaseAttempts();
      return { success: true, attempt: data as Attempt };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save attempt';
      return { success: false, error: msg };
    }
  };

  const updateAttempt = async (
    attemptId: string,
    updates: Partial<LogAttemptInput>
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error: updErr } = await supabase
        .from('attempts')
        .update(updates)
        .eq('id', attemptId);

      if (updErr) throw updErr;

      await loadSupabaseAttempts();
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update attempt';
      return { success: false, error: msg };
    }
  };

  const deleteAttempt = async (
    attemptId: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error: delErr } = await supabase
        .from('attempts')
        .delete()
        .eq('id', attemptId);

      if (delErr) throw delErr;

      await loadSupabaseAttempts();
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete attempt';
      return { success: false, error: msg };
    }
  };

  const getAttemptForProblem = useCallback(
    (problemId: string): Attempt | undefined => {
      return attempts.find((a) => a.problem_id === problemId);
    },
    [attempts]
  );

  return {
    attempts,
    friendAttempts,
    loading,
    error,
    logAttempt,
    updateAttempt,
    deleteAttempt,
    getAttemptForProblem,
    refreshAttempts: loadSupabaseAttempts,
  };
}

export default useAttempts;
