import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Attempt } from '../data/types';
import { hydrateAttempts } from '../lib/problems';
import { notifyDataChanged, useDataRefresh } from '../lib/dataSync';

export interface UseNeedsRevisitReturn {
  readonly revisitProblems: readonly Attempt[];
  readonly loading: boolean;
  readonly error: string | null;
  readonly toggleRevisitFlag: (attemptId: string, needsRevisit: boolean) => Promise<void>;
  readonly markReviewed: (attemptId: string) => Promise<void>;
  readonly refreshRevisits: () => Promise<void>;
}

export function useNeedsRevisit(currentUserId?: string): UseNeedsRevisitReturn {
  const [revisitProblems, setRevisitProblems] = useState<readonly Attempt[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadSupabaseRevisits = useCallback(async () => {
    if (!currentUserId) {
      setRevisitProblems([]);
      setLoading(false);
      return;
    }

    try {
      setError(null);

      const { data, error: attErr } = await supabase
        .from('attempts')
        .select('*, user:profiles(*)')
        .eq('user_id', currentUserId)
        .or('needs_revisit.eq.true,status.eq.needs_review')
        .order('solved_at', { ascending: false });

      if (attErr) throw attErr;

      setRevisitProblems(hydrateAttempts(data));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error fetching revisit problems';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    loadSupabaseRevisits();

    if (currentUserId) {
      const channel = supabase
        .channel(`revisits-${currentUserId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'attempts', filter: `user_id=eq.${currentUserId}` },
          () => {
            loadSupabaseRevisits();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [currentUserId, loadSupabaseRevisits]);

  useDataRefresh(loadSupabaseRevisits, Boolean(currentUserId));

  const toggleRevisitFlag = async (attemptId: string, needsRevisit: boolean) => {
    try {
      const { error: updErr } = await supabase
        .from('attempts')
        .update({ needs_revisit: needsRevisit })
        .eq('id', attemptId);

      if (updErr) throw updErr;
      await loadSupabaseRevisits();
      notifyDataChanged();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update revisit flag';
      setError(msg);
    }
  };

  const markReviewed = async (attemptId: string) => {
    try {
      const { error: updErr } = await supabase
        .from('attempts')
        .update({
          needs_revisit: false,
          status: 'solved',
          revisit_by: null,
        })
        .eq('id', attemptId);

      if (updErr) throw updErr;
      await loadSupabaseRevisits();
      notifyDataChanged();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to mark problem as reviewed';
      setError(msg);
    }
  };

  return {
    revisitProblems,
    loading,
    error,
    toggleRevisitFlag,
    markReviewed,
    refreshRevisits: loadSupabaseRevisits,
  };
}

export default useNeedsRevisit;
