import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Attempt, LogAttemptInput } from '../data/types';
import { hydrateAttempts, hydrateAttempt } from '../lib/problems';
import { notifyDataChanged, useDataRefresh, writeWithColumnFallback } from '../lib/dataSync';

// Problems are resolved client-side (attempts.problem_id has no FK to problems).
const ATTEMPT_SELECT = '*, user:profiles(*)';

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
      setError(null);

      // 1. Fetch own attempts
      const { data: ownData, error: ownErr } = await supabase
        .from('attempts')
        .select(ATTEMPT_SELECT)
        .eq('user_id', currentUserId)
        .order('solved_at', { ascending: false });

      if (ownErr) throw ownErr;

      // 2. Fetch friends' attempts (RLS allows select if friendship is accepted)
      const { data: friendData, error: friendErr } = await supabase
        .from('attempts')
        .select(ATTEMPT_SELECT)
        .neq('user_id', currentUserId)
        .order('solved_at', { ascending: false })
        .limit(30);

      if (friendErr) throw friendErr;

      setAttempts(hydrateAttempts(ownData));
      setFriendAttempts(hydrateAttempts(friendData));
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

  useDataRefresh(loadSupabaseAttempts, Boolean(currentUserId));

  const logAttempt = async (
    input: LogAttemptInput
  ): Promise<{ success: boolean; attempt?: Attempt; error?: string }> => {
    if (!currentUserId) {
      return { success: false, error: 'User is not logged in' };
    }

    try {
      const needsRevisit = input.needs_revisit ?? input.status === 'needs_review';
      const { data, error: insertErr } = await writeWithColumnFallback(
        {
          user_id: currentUserId,
          problem_id: input.problem_id,
          status: input.status,
          confidence_rating: input.confidence_rating,
          time_spent_min: input.time_spent_min,
          approach_notes: input.approach_notes,
          pattern_tag: input.pattern_tag,
          time_complexity: input.time_complexity,
          space_complexity: input.space_complexity,
          submission_url: input.submission_url,
          needs_revisit: needsRevisit,
          revisit_by: needsRevisit ? new Date(Date.now() + 3 * 86400000).toISOString() : null,
          solved_at: new Date().toISOString(),
        },
        (body) => supabase.from('attempts').insert(body).select(ATTEMPT_SELECT).single()
      );

      if (insertErr) throw insertErr;

      await loadSupabaseAttempts();
      notifyDataChanged();
      return { success: true, attempt: hydrateAttempt(data) };
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
      const { error: updErr } = await writeWithColumnFallback({ ...updates }, (body) =>
        supabase.from('attempts').update(body).eq('id', attemptId)
      );

      if (updErr) throw updErr;

      await loadSupabaseAttempts();
      notifyDataChanged();
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
      notifyDataChanged();
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
