import { useState, useEffect, useCallback, useMemo } from 'react';
import { FriendPoke } from '../data/types';
import {
  demoStore,
  DEMO_USER_ID,
  isDemoModeActive,
  isSupabaseConfigured,
  supabase,
} from '../lib/supabase';

export interface UsePokesReturn {
  readonly pokes: readonly FriendPoke[];
  readonly recentPokes: readonly FriendPoke[];
  readonly loading: boolean;
  readonly error: string | null;
  readonly pokeFriend: (
    friendId: string,
    message?: string
  ) => Promise<{ success: boolean; poke?: FriendPoke; error?: string }>;
  readonly canPokeToday: (friendId: string) => boolean;
  readonly refreshPokes: () => Promise<void>;
}

/**
 * Hook to manage peer nudges and pokes,
 * enforcing a 24-hour rate limit per friend to foster healthy accountability.
 */
export function usePokes(currentUserId?: string): UsePokesReturn {
  const [pokes, setPokes] = useState<readonly FriendPoke[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const effectiveUserId = currentUserId || DEMO_USER_ID;
  const isDemo = isDemoModeActive() || !isSupabaseConfigured;

  const loadDemoPokes = useCallback(() => {
    try {
      const items = demoStore.getPokes(effectiveUserId);
      setPokes(items);
      setLoading(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load demo pokes';
      setError(msg);
      setLoading(false);
    }
  }, [effectiveUserId]);

  const loadSupabasePokes = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error: fetchErr } = await supabase
        .from('friend_pokes')
        .select(`
          *,
          sender:profiles!friend_pokes_sender_id_fkey(*),
          receiver:profiles!friend_pokes_receiver_id_fkey(*)
        `)
        .or(`sender_id.eq.${effectiveUserId},receiver_id.eq.${effectiveUserId}`)
        .order('poked_at', { ascending: false });

      if (fetchErr) {
        // Fallback to demo store if table does not exist yet
        loadDemoPokes();
        return;
      }

      setPokes((data as FriendPoke[]) || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error fetching pokes';
      setError(msg);
      loadDemoPokes();
    } finally {
      setLoading(false);
    }
  }, [effectiveUserId, loadDemoPokes]);

  const refreshPokes = useCallback(async () => {
    if (isDemo) {
      loadDemoPokes();
    } else {
      await loadSupabasePokes();
    }
  }, [isDemo, loadDemoPokes, loadSupabasePokes]);

  useEffect(() => {
    if (isDemo) {
      loadDemoPokes();
      const unsub = demoStore.subscribe('pokes', loadDemoPokes);
      return unsub;
    } else {
      loadSupabasePokes();
      const channel = supabase
        .channel(`pokes-${effectiveUserId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'friend_pokes' },
          () => {
            loadSupabasePokes();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [isDemo, loadDemoPokes, loadSupabasePokes, effectiveUserId]);

  const canPokeToday = useCallback(
    (friendId: string): boolean => {
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
      const lastPoke = pokes.find(
        (p) =>
          p.sender_id === effectiveUserId &&
          p.receiver_id === friendId &&
          new Date(p.poked_at).getTime() > oneDayAgo
      );
      return !lastPoke;
    },
    [pokes, effectiveUserId]
  );

  const pokeFriend = async (
    friendId: string,
    message: string = 'Sent you a practice reminder!'
  ): Promise<{ success: boolean; poke?: FriendPoke; error?: string }> => {
    if (!canPokeToday(friendId)) {
      return {
        success: false,
        error: 'You can only nudge this peer once every 24 hours.',
      };
    }

    if (isDemo) {
      const result = demoStore.pokeFriend(effectiveUserId, friendId, message);
      return result;
    }

    try {
      const { data, error: insertErr } = await supabase
        .from('friend_pokes')
        .insert({
          sender_id: effectiveUserId,
          receiver_id: friendId,
          message: message.trim(),
          poked_at: new Date().toISOString(),
        })
        .select(`
          *,
          sender:profiles!friend_pokes_sender_id_fkey(*),
          receiver:profiles!friend_pokes_receiver_id_fkey(*)
        `)
        .single();

      if (insertErr) throw insertErr;
      await refreshPokes();
      return { success: true, poke: data as FriendPoke };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send poke';
      return { success: false, error: msg };
    }
  };

  // Nudges sent to the current user
  const recentPokes = useMemo<readonly FriendPoke[]>(() => {
    return pokes.filter((p) => p.receiver_id === effectiveUserId);
  }, [pokes, effectiveUserId]);

  return {
    pokes,
    recentPokes,
    loading,
    error,
    pokeFriend,
    canPokeToday,
    refreshPokes,
  };
}
