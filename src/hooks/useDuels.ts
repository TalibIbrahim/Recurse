import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Duel } from '../data/types';

export interface UseDuelsReturn {
  readonly duels: readonly Duel[];
  readonly activeDuels: readonly Duel[];
  readonly pendingDuels: readonly Duel[];
  readonly completedDuels: readonly Duel[];
  readonly loading: boolean;
  readonly error: string | null;
  readonly sendChallenge: (
    opponentId: string,
    problemId: string,
    timeLimitSec?: number
  ) => Promise<{ success: boolean; duel?: Duel; error?: string }>;
  readonly acceptDuel: (duelId: string) => Promise<{ success: boolean; duel?: Duel; error?: string }>;
  readonly declineDuel: (duelId: string) => Promise<{ success: boolean; error?: string }>;
  readonly submitSolve: (
    duelId: string,
    solveTimeSec: number
  ) => Promise<{ success: boolean; duel?: Duel; error?: string }>;
  readonly getDuelById: (duelId: string) => Duel | undefined;
  readonly refreshDuels: () => Promise<void>;
}

export function useDuels(currentUserId?: string): UseDuelsReturn {
  const [duels, setDuels] = useState<readonly Duel[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadSupabaseDuels = useCallback(async () => {
    if (!currentUserId) {
      setDuels([]);
      setLoading(false);
      return;
    }

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
        .or(`challenger_id.eq.${currentUserId},opponent_id.eq.${currentUserId}`)
        .order('created_at', { ascending: false });

      if (fetchErr) throw fetchErr;

      setDuels((data as Duel[]) || []);
    } catch {
      setDuels([]);
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    loadSupabaseDuels();
    if (currentUserId) {
      const channel = supabase
        .channel(`duels-${currentUserId}`)
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
  }, [loadSupabaseDuels, currentUserId]);

  const sendChallenge = async (
    opponentId: string,
    problemId: string,
    timeLimitSec: number = 1800
  ): Promise<{ success: boolean; duel?: Duel; error?: string }> => {
    if (!currentUserId) {
      return { success: false, error: 'User is not logged in' };
    }

    try {
      const { data, error: insertErr } = await supabase
        .from('duels')
        .insert({
          challenger_id: currentUserId,
          opponent_id: opponentId,
          problem_id: problemId,
          time_limit_sec: timeLimitSec,
          status: 'pending',
        })
        .select(`
          *,
          problem:problems(*),
          challenger:profiles!duels_challenger_id_fkey(*),
          opponent:profiles!duels_opponent_id_fkey(*)
        `)
        .single();

      if (insertErr) throw insertErr;
      await loadSupabaseDuels();
      return { success: true, duel: data as Duel };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create challenge';
      return { success: false, error: msg };
    }
  };

  const acceptDuel = async (
    duelId: string
  ): Promise<{ success: boolean; duel?: Duel; error?: string }> => {
    try {
      const nowIso = new Date().toISOString();
      const { data, error: updateErr } = await supabase
        .from('duels')
        .update({
          status: 'active',
          started_at: nowIso,
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
      await loadSupabaseDuels();
      return { success: true, duel: data as Duel };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to accept duel';
      return { success: false, error: msg };
    }
  };

  const declineDuel = async (
    duelId: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error: delErr } = await supabase
        .from('duels')
        .delete()
        .eq('id', duelId);

      if (delErr) throw delErr;
      await loadSupabaseDuels();
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
    if (!currentUserId) return { success: false, error: 'User is not logged in' };
    const current = duels.find((d) => d.id === duelId);
    if (!current) return { success: false, error: 'Duel not found' };

    const isChallenger = current.challenger_id === currentUserId;
    const updates: Partial<Duel> = {
      status: 'completed',
      end_time: new Date().toISOString(),
      winner_id: currentUserId,
      ...(isChallenger ? { challenger_time_sec: solveTimeSec } : { opponent_time_sec: solveTimeSec }),
    };

    try {
      const { data, error: updErr } = await supabase
        .from('duels')
        .update(updates)
        .eq('id', duelId)
        .select(`
          *,
          problem:problems(*),
          challenger:profiles!duels_challenger_id_fkey(*),
          opponent:profiles!duels_opponent_id_fkey(*)
        `)
        .single();

      if (updErr) throw updErr;
      await loadSupabaseDuels();
      return { success: true, duel: data as Duel };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to submit solve';
      return { success: false, error: msg };
    }
  };

  const getDuelById = useCallback(
    (duelId: string): Duel | undefined => {
      return duels.find((d) => d.id === duelId);
    },
    [duels]
  );

  const activeDuels = useMemo(() => duels.filter((d) => d.status === 'active'), [duels]);
  const pendingDuels = useMemo(() => duels.filter((d) => d.status === 'pending'), [duels]);
  const completedDuels = useMemo(() => duels.filter((d) => d.status === 'completed'), [duels]);

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
    refreshDuels: loadSupabaseDuels,
  };
}

export default useDuels;
