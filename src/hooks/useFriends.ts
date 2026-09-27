import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { FriendWithStatus, Friendship, Profile } from '../data/types';

export interface UseFriendsReturn {
  readonly friends: readonly FriendWithStatus[];
  readonly pendingRequests: readonly Friendship[];
  readonly sentRequests: readonly Friendship[];
  readonly loading: boolean;
  readonly error: string | null;
  readonly searchUsers: (query: string) => Promise<Profile[]>;
  readonly sendFriendRequest: (targetUserId: string) => Promise<{ success: boolean; error?: string }>;
  readonly respondToRequest: (
    friendshipId: string,
    action: 'accept' | 'reject'
  ) => Promise<{ success: boolean; error?: string }>;
  readonly removeFriend: (friendshipId: string) => Promise<{ success: boolean; error?: string }>;
  readonly refreshFriends: () => Promise<void>;
}

export function useFriends(currentUserId?: string): UseFriendsReturn {
  const [friends, setFriends] = useState<readonly FriendWithStatus[]>([]);
  const [pendingRequests, setPendingRequests] = useState<readonly Friendship[]>([]);
  const [sentRequests, setSentRequests] = useState<readonly Friendship[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadSupabaseFriends = useCallback(async () => {
    if (!currentUserId) {
      setFriends([]);
      setPendingRequests([]);
      setSentRequests([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch all friendships for the user
      const { data: friendshipsData, error: fsError } = await supabase
        .from('friendships')
        .select(`
          id,
          requester_id,
          addressee_id,
          status,
          created_at,
          updated_at,
          requester:profiles!requester_id(*),
          addressee:profiles!addressee_id(*)
        `)
        .or(`requester_id.eq.${currentUserId},addressee_id.eq.${currentUserId}`);

      if (fsError) throw fsError;

      const todayStr = new Date().toISOString().split('T')[0];
      const accepted: FriendWithStatus[] = [];
      const pendingIn: Friendship[] = [];
      const pendingOut: Friendship[] = [];

      if (friendshipsData) {
        for (const row of friendshipsData as unknown as {
          id: string;
          requester_id: string;
          addressee_id: string;
          status: 'pending' | 'accepted' | 'rejected';
          created_at: string;
          updated_at: string;
          requester: Profile;
          addressee: Profile;
        }[]) {
          const isRequester = row.requester_id === currentUserId;
          const otherProfile = isRequester ? row.addressee : row.requester;
          if (!otherProfile) continue;

          if (row.status === 'accepted') {
            const { data: streakData } = await supabase
              .from('streaks')
              .select('current_streak')
              .eq('user_id', otherProfile.id)
              .maybeSingle();

            const { count: solvedTodayCount } = await supabase
              .from('attempts')
              .select('id', { count: 'exact', head: true })
              .eq('user_id', otherProfile.id)
              .eq('status', 'solved')
              .gte('solved_at', `${todayStr}T00:00:00Z`);

            accepted.push({
              friendship_id: row.id,
              status: 'accepted',
              profile: otherProfile,
              is_online: otherProfile.is_online,
              last_seen_at: otherProfile.last_seen_at,
              solved_today_count: solvedTodayCount || 0,
              current_streak: streakData?.current_streak || 0,
              weekly_points: (solvedTodayCount || 0) * 3 + (streakData?.current_streak || 0) * 2,
            });
          } else if (row.status === 'pending') {
            const friendshipObj: Friendship = {
              id: row.id,
              requester_id: row.requester_id,
              addressee_id: row.addressee_id,
              status: row.status,
              created_at: row.created_at,
              updated_at: row.updated_at,
              friend_profile: otherProfile,
            };

            if (row.addressee_id === currentUserId) {
              pendingIn.push(friendshipObj);
            } else {
              pendingOut.push(friendshipObj);
            }
          }
        }
      }

      setFriends(accepted);
      setPendingRequests(pendingIn);
      setSentRequests(pendingOut);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error fetching friends from Supabase';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    loadSupabaseFriends();

    if (currentUserId) {
      const channel = supabase
        .channel(`friendships-${currentUserId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'friendships' },
          () => {
            loadSupabaseFriends();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [currentUserId, loadSupabaseFriends]);

  const searchUsers = async (query: string): Promise<Profile[]> => {
    if (!query.trim()) return [];
    try {
      const { data, error: searchErr } = await supabase
        .from('profiles')
        .select('*')
        .neq('id', currentUserId || '')
        .or(`username.ilike.%${query}%,full_name.ilike.%${query}%`)
        .limit(10);

      if (searchErr) throw searchErr;
      return (data as Profile[]) || [];
    } catch (err: unknown) {
      console.error('Error searching profiles:', err);
      return [];
    }
  };

  const sendFriendRequest = async (
    targetUserId: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!currentUserId) {
      return { success: false, error: 'User is not logged in' };
    }

    try {
      const { error: insertErr } = await supabase.from('friendships').insert({
        requester_id: currentUserId,
        addressee_id: targetUserId,
        status: 'pending',
      });

      if (insertErr) throw insertErr;
      await loadSupabaseFriends();
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send request';
      return { success: false, error: msg };
    }
  };

  const respondToRequest = async (
    friendshipId: string,
    action: 'accept' | 'reject'
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      if (action === 'accept') {
        const { error: updateErr } = await supabase
          .from('friendships')
          .update({ status: 'accepted', updated_at: new Date().toISOString() })
          .eq('id', friendshipId);

        if (updateErr) throw updateErr;
      } else {
        const { error: delErr } = await supabase
          .from('friendships')
          .delete()
          .eq('id', friendshipId);

        if (delErr) throw delErr;
      }

      await loadSupabaseFriends();
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update request';
      return { success: false, error: msg };
    }
  };

  const removeFriend = async (
    friendshipId: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error: delErr } = await supabase
        .from('friendships')
        .delete()
        .eq('id', friendshipId);

      if (delErr) throw delErr;
      await loadSupabaseFriends();
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to remove friend';
      return { success: false, error: msg };
    }
  };

  return {
    friends,
    pendingRequests,
    sentRequests,
    loading,
    error,
    searchUsers,
    sendFriendRequest,
    respondToRequest,
    removeFriend,
    refreshFriends: loadSupabaseFriends,
  };
}

export default useFriends;
