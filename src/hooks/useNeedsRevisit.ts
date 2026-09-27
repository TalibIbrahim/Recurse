import { useState, useEffect, useCallback } from 'react';
import {
  supabase,
  isSupabaseConfigured,
  isDemoModeActive,
  demoStore,
  DEMO_USER_ID,
} from '../lib/supabase';
import { Attempt } from '../data/types';

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

  const effectiveUserId = currentUserId || DEMO_USER_ID;
  const isDemo = isDemoModeActive() || !isSupabaseConfigured;

  const filterRevisits = (attempts: Attempt[]): Attempt[] => {
    const nowMs = Date.now();
    const threeDaysMs = 3 * 24 * 60 * 60 * 1000;

    return attempts.filter((att) => {
      // 1. Explicitly flagged
      if (att.needs_revisit) return true;
      // 2. Status set to needs_review
      if (att.status === 'needs_review') return true;
      // 3. Solved > 3 days ago and has revisit_by date in the past
      if (att.revisit_by && new Date(att.revisit_by).getTime() <= nowMs) {
        return true;
      }
      // 4. Any attempt solved > 3 days ago that hasn't been re-attempted
      const ageMs = nowMs - new Date(att.solved_at).getTime();
      if (att.status === 'solved' && ageMs > threeDaysMs && att.needs_revisit) {
        return true;
      }
      return false;
    });
  };

  const loadDemoRevisits = useCallback(() => {
    try {
      const attempts = demoStore.getAttempts(effectiveUserId);
      const filtered = filterRevisits(attempts);
      setRevisitProblems(filtered);
      setLoading(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load revisit problems';
      setError(msg);
      setLoading(false);
    }
  }, [effectiveUserId]);

  const loadSupabaseRevisits = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: attErr } = await supabase
        .from('attempts')
        .select(`
          *,
          problem:problems(*),
          user:profiles(*)
        `)
        .eq('user_id', effectiveUserId)
        .or('needs_revisit.eq.true,status.eq.needs_review')
        .order('solved_at', { ascending: false });

      if (attErr) throw attErr;

      setRevisitProblems((data as Attempt[]) || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error fetching revisit problems';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [effectiveUserId]);

  const refreshRevisits = useCallback(async () => {
    if (isDemo) {
      loadDemoRevisits();
    } else {
      await loadSupabaseRevisits();
    }
  }, [isDemo, loadDemoRevisits, loadSupabaseRevisits]);

  useEffect(() => {
    if (isDemo) {
      loadDemoRevisits();
      const unsub = demoStore.subscribe('attempts', loadDemoRevisits);
      return unsub;
    } else {
      loadSupabaseRevisits();
      const channel = supabase
        .channel(`revisits-${effectiveUserId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'attempts', filter: `user_id=eq.${effectiveUserId}` },
          () => {
            loadSupabaseRevisits();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [isDemo, loadDemoRevisits, loadSupabaseRevisits, effectiveUserId]);

  const toggleRevisitFlag = async (attemptId: string, needsRevisit: boolean) => {
    if (isDemo) {
      demoStore.updateAttempt(attemptId, {
        needs_revisit: needsRevisit,
      });
      loadDemoRevisits();
      return;
    }

    try {
      const { error: updateErr } = await supabase
        .from('attempts')
        .update({
          needs_revisit: needsRevisit,
          updated_at: new Date().toISOString(),
        })
        .eq('id', attemptId)
        .eq('user_id', effectiveUserId);

      if (updateErr) throw updateErr;
      await refreshRevisits();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update revisit flag';
      setError(msg);
    }
  };

  const markReviewed = async (attemptId: string) => {
    if (isDemo) {
      demoStore.updateAttempt(attemptId, {
        status: 'solved',
        needs_revisit: false,
      });
      loadDemoRevisits();
      return;
    }

    try {
      const { error: updateErr } = await supabase
        .from('attempts')
        .update({
          status: 'solved',
          needs_revisit: false,
          solved_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', attemptId)
        .eq('user_id', effectiveUserId);

      if (updateErr) throw updateErr;
      await refreshRevisits();
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
    refreshRevisits,
  };
}
