import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { FriendPoke } from '../data/types';

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

export function usePokes(currentUserId?: string): UsePokesReturn {
  const [pokes, setPokes] = useState<readonly FriendPoke[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadSupabasePokes = useCallback(async () => {
    if (!currentUserId) {
      setPokes([]);
      setLoading(false);
      return;
    }

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
        .or(`sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`)
        .order('poked_at', { ascending: false });

      if (fetchErr) throw fetchErr;

      setPokes((data as FriendPoke[]) || []);
    } catch {
      setPokes([]);
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    loadSupabasePokes();
    if (currentUserId) {
      const channel = supabase
        .channel(`pokes-${currentUserId}`)
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
  }, [loadSupabasePokes, currentUserId]);

  const canPokeToday = useCallback(
    (friendId: string): boolean => {
      if (!currentUserId) return false;
      const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
      const existing = pokes.find(
        (p) =>
          p.sender_id === currentUserId &&
          p.receiver_id === friendId &&
          new Date(p.poked_at).getTime() > twentyFourHoursAgo
      );
      return !existing;
    },
    [pokes, currentUserId]
  );

  const pokeFriend = async (
    friendId: string,
    message: string = 'Friendly nudge: Keep your streak alive today!'
  ): Promise<{ success: boolean; poke?: FriendPoke; error?: string }> => {
    if (!currentUserId) {
      return { success: false, error: 'User is not logged in' };
    }

    if (!canPokeToday(friendId)) {
      return {
        success: false,
        error: 'You have already poked this friend in the last 24 hours.',
      };
    }

    try {
      const { data, error: insertErr } = await supabase
        .from('friend_pokes')
        .insert({
          sender_id: currentUserId,
          receiver_id: friendId,
          message,
        })
        .select(`
          *,
          sender:profiles!friend_pokes_sender_id_fkey(*),
          receiver:profiles!friend_pokes_receiver_id_fkey(*)
        `)
        .single();

      if (insertErr) throw insertErr;
      await loadSupabasePokes();
      return { success: true, poke: data as FriendPoke };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send poke';
      return { success: false, error: msg };
    }
  };

  const recentPokes = useMemo(() => {
    if (!currentUserId) return [];
    return pokes.filter((p) => p.receiver_id === currentUserId);
  }, [pokes, currentUserId]);

  return {
    pokes,
    recentPokes,
    loading,
    error,
    pokeFriend,
    canPokeToday,
    refreshPokes: loadSupabasePokes,
  };
}

export default usePokes;
