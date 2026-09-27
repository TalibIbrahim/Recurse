import { useState, useEffect, useCallback, useMemo } from 'react';
import { Duel } from '../data/types';
import {
  demoStore,
  DEMO_USER_ID,
  isDemoModeActive,
  isSupabaseConfigured,
  supabase,
} from '../lib/supabase';

export interface UseDuelsReturn {
  readonly duels: readonly Duel[];
  readonly activeDuels: readonly Duel[];
  readonly pendingDuels: readonly Duel[];
  readonly completedDuels: readonly Duel[];
  readonly loading: boolean;
  readonly error: string | null;
  readonly sendChallenge: (
    opponentId: string,
    problemId: string
  ) => Promise<{ success: boolean; duel?: Duel; error?: string }>;
  readonly acceptDuel: (
    duelId: string
  ) => Promise<{ success: boolean; duel?: Duel; error?: string }>;
  readonly declineDuel: (
    duelId: string
  ) => Promise<{ success: boolean; error?: string }>;
  readonly submitSolve: (
    duelId: string,
    solveTimeSec: number
  ) => Promise<{ success: boolean; duel?: Duel; error?: string }>;
  readonly getDuelById: (duelId: string) => Duel | undefined;
  readonly refreshDuels: () => Promise<void>;
}

/**
 * Hook to manage 1v1 problem solving duels between friends,
 * handling challenges, real-time status transitions, timers, and winner determination.
 */
export function useDuels(currentUserId?: string): UseDuelsReturn {
  const [duels, setDuels] = useState<readonly Duel[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const effectiveUserId = currentUserId || DEMO_USER_ID;
  const isDemo = isDemoModeActive() || !isSupabaseConfigured;

  const loadDemoDuels = useCallback(() => {
    try {
      const items = demoStore.getDuels(effectiveUserId);
      setDuels(items);
      setLoading(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load demo duels';
      setError(msg);
      setLoading(false);
    }
  }, [effectiveUserId]);

  const loadSupabaseDuels = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error: fetchErr } = await supabase
        .from('duels')
        .select(`
          *,
          problem:problems(*),
          challenger:profiles!duels_challenger_id_fkey(*),
          opponent:profiles!duels_opponent_id_fkey(*)
        `)
        .or(`challenger_id.eq.${effectiveUserId},opponent_id.eq.${effectiveUserId}`)
        .order('created_at', { ascending: false });

      if (fetchErr) {
        // Fallback to demo store if table does not exist
        loadDemoDuels();
        return;
      }

      setDuels((data as Duel[]) || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error fetching duels';
      setError(msg);
      loadDemoDuels();
    } finally {
      setLoading(false);
    }
  }, [effectiveUserId, loadDemoDuels]);

  const refreshDuels = useCallback(async () => {
    if (isDemo) {
      loadDemoDuels();
    } else {
      await loadSupabaseDuels();
    }
  }, [isDemo, loadDemoDuels, loadSupabaseDuels]);

  useEffect(() => {
    if (isDemo) {
      loadDemoDuels();
      const unsub = demoStore.subscribe('duels', loadDemoDuels);
      return unsub;
    } else {
      loadSupabaseDuels();
      const channel = supabase
        .channel(`duels-${effectiveUserId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'duels' },
          () => {
            loadSupabaseDuels();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [isDemo, loadDemoDuels, loadSupabaseDuels, effectiveUserId]);

  const sendChallenge = async (
    opponentId: string,
    problemId: string
  ): Promise<{ success: boolean; duel?: Duel; error?: string }> => {
    if (isDemo) {
      const newDuel = demoStore.createDuel(effectiveUserId, opponentId, problemId);
      return { success: true, duel: newDuel };
    }

    try {
      const { data, error: insertErr } = await supabase
        .from('duels')
        .insert({
          challenger_id: effectiveUserId,
          opponent_id: opponentId,
          problem_id: problemId,
          status: 'pending',
          created_at: new Date().toISOString(),
        })
        .select(`
          *,
          problem:problems(*),
          challenger:profiles!duels_challenger_id_fkey(*),
          opponent:profiles!duels_opponent_id_fkey(*)
        `)
        .single();

      if (insertErr) throw insertErr;
      await refreshDuels();
      return { success: true, duel: data as Duel };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send challenge';
      return { success: false, error: msg };
    }
  };

  const acceptDuel = async (
    duelId: string
  ): Promise<{ success: boolean; duel?: Duel; error?: string }> => {
    if (isDemo) {
      const updated = demoStore.acceptDuel(duelId);
      if (!updated) return { success: false, error: 'Duel not found or already accepted' };
      return { success: true, duel: updated };
    }

    try {
      const { data, error: updateErr } = await supabase
        .from('duels')
        .update({
          status: 'active',
          start_time: new Date().toISOString(),
        })
        .eq('id', duelId)
        .select(`
          *,
          problem:problems(*),
          challenger:profiles!duels_challenger_id_fkey(*),
          opponent:profiles!duels_opponent_id_fkey(*)
        `)
        .single();

      if (updateErr) throw updateErr;
      await refreshDuels();
      return { success: true, duel: data as Duel };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to accept duel';
      return { success: false, error: msg };
    }
  };

  const declineDuel = async (
    duelId: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (isDemo) {
      const updated = demoStore.declineDuel(duelId);
      if (!updated) return { success: false, error: 'Duel not found' };
      return { success: true };
    }

    try {
      const { error: updateErr } = await supabase
        .from('duels')
        .update({ status: 'declined' })
        .eq('id', duelId);

      if (updateErr) throw updateErr;
      await refreshDuels();
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to decline duel';
      return { success: false, error: msg };
    }
  };

  const submitSolve = async (
    duelId: string,
    solveTimeSec: number
  ): Promise<{ success: boolean; duel?: Duel; error?: string }> => {
    if (isDemo) {
      const updated = demoStore.completeDuel(duelId, effectiveUserId, solveTimeSec);
      if (!updated) return { success: false, error: 'Duel not found' };
      return { success: true, duel: updated };
    }

    try {
      // Fetch duel to check participant role
      const current = duels.find((d) => d.id === duelId);
      if (!current) throw new Error('Duel not found');

      const isChallenger = current.challenger_id === effectiveUserId;
      const updates = isChallenger
        ? { challenger_time_sec: solveTimeSec }
        : { opponent_time_sec: solveTimeSec };

      const { data, error: updateErr } = await supabase
        .from('duels')
        .update({
          ...updates,
          status: 'completed',
          winner_id: effectiveUserId,
          end_time: new Date().toISOString(),
        })
        .eq('id', duelId)
        .select(`
          *,
          problem:problems(*),
          challenger:profiles!duels_challenger_id_fkey(*),
          opponent:profiles!duels_opponent_id_fkey(*)
        `)
        .single();

      if (updateErr) throw updateErr;
      await refreshDuels();
      return { success: true, duel: data as Duel };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to submit duel solve';
      return { success: false, error: msg };
    }
  };

  const getDuelById = useCallback(
    (duelId: string): Duel | undefined => {
      return duels.find((d) => d.id === duelId);
    },
    [duels]
  );

  const activeDuels = useMemo<readonly Duel[]>(() => {
    return duels.filter((d) => d.status === 'active');
  }, [duels]);

  const pendingDuels = useMemo<readonly Duel[]>(() => {
    return duels.filter((d) => d.status === 'pending');
  }, [duels]);

  const completedDuels = useMemo<readonly Duel[]>(() => {
    return duels.filter((d) => d.status === 'completed');
  }, [duels]);

  return {
    duels,
    activeDuels,
    pendingDuels,
    completedDuels,
    loading,
    error,
    sendChallenge,
    acceptDuel,
    declineDuel,
    submitSolve,
    getDuelById,
    refreshDuels,
  };
}
