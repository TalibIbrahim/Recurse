import { useState, useEffect, useCallback } from 'react';
import {
  supabase,
  isSupabaseConfigured,
  isDemoModeActive,
  demoStore,
  DEMO_USER_ID,
} from '../lib/supabase';
import { Friendship, FriendWithStatus, Profile } from '../data/types';

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

  const effectiveUserId = currentUserId || DEMO_USER_ID;
  const isDemo = isDemoModeActive() || !isSupabaseConfigured;

  const loadDemoFriends = useCallback(() => {
    try {
      const allFriendships = demoStore.getFriendships(effectiveUserId);
      const todayStr = new Date().toISOString().split('T')[0];

      const acceptedList: FriendWithStatus[] = [];
      const pendingIncoming: Friendship[] = [];
      const pendingOutgoing: Friendship[] = [];

      allFriendships.forEach((f) => {
        if (!f.friend_profile) return;

        if (f.status === 'accepted') {
          const friendId = f.friend_profile.id;
          const friendAttempts = demoStore.getAttempts(friendId);
          const solvedToday = friendAttempts.filter(
            (a) => a.status === 'solved' && a.solved_at.startsWith(todayStr)
          ).length;
          const streak = demoStore.getStreak(friendId);

          acceptedList.push({
            friendship_id: f.id,
            status: 'accepted',
            profile: f.friend_profile,
            is_online: f.friend_profile.is_online,
            last_seen_at: f.friend_profile.last_seen_at,
            solved_today_count: solvedToday,
            current_streak: streak.current_streak,
            weekly_points: solvedToday * 3 + streak.current_streak * 2,
          });
        } else if (f.status === 'pending') {
          if (f.addressee_id === effectiveUserId) {
            pendingIncoming.push(f);
          } else {
            pendingOutgoing.push(f);
          }
        }
      });

      setFriends(acceptedList);
      setPendingRequests(pendingIncoming);
      setSentRequests(pendingOutgoing);
      setLoading(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load friends';
      setError(msg);
      setLoading(false);
    }
  }, [effectiveUserId]);

  const loadSupabaseFriends = useCallback(async () => {
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
        .or(`requester_id.eq.${effectiveUserId},addressee_id.eq.${effectiveUserId}`);

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
          const isRequester = row.requester_id === effectiveUserId;
          const otherProfile = isRequester ? row.addressee : row.requester;

          if (row.status === 'accepted') {
            // Fetch friend's streak and today's solves
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

            if (row.addressee_id === effectiveUserId) {
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
  }, [effectiveUserId]);

  const refreshFriends = useCallback(async () => {
    if (isDemo) {
      loadDemoFriends();
    } else {
      await loadSupabaseFriends();
    }
  }, [isDemo, loadDemoFriends, loadSupabaseFriends]);

  useEffect(() => {
    if (isDemo) {
      loadDemoFriends();
      const unsub = demoStore.subscribe('friendships', () => {
        loadDemoFriends();
      });
      return unsub;
    } else {
      loadSupabaseFriends();

      // Realtime subscription for friendships
      const channel = supabase
        .channel(`friendships-${effectiveUserId}`)
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
  }, [isDemo, loadDemoFriends, loadSupabaseFriends, effectiveUserId]);

  const searchUsers = async (query: string): Promise<Profile[]> => {
    if (!query.trim()) return [];

    if (isDemo) {
      return demoStore.searchProfiles(query);
    }

    try {
      const { data, error: searchErr } = await supabase
        .from('profiles')
        .select('*')
        .neq('id', effectiveUserId)
        .or(`username.ilike.%${query}%,full_name.ilike.%${query}%,leetcode_username.ilike.%${query}%`)
        .limit(10);

      if (searchErr) throw searchErr;
      return (data as Profile[]) || [];
    } catch (err: unknown) {
      console.error('Error searching profiles:', err);
      return [];
    }
  };

  const sendFriendRequest = async (targetUserId: string): Promise<{ success: boolean; error?: string }> => {
    if (targetUserId === effectiveUserId) {
      return { success: false, error: 'Cannot add yourself as a friend' };
    }

    if (isDemo) {
      demoStore.sendFriendRequest(effectiveUserId, targetUserId);
      return { success: true };
    }

    try {
      const { error: insertErr } = await supabase.from('friendships').insert({
        requester_id: effectiveUserId,
        addressee_id: targetUserId,
        status: 'pending',
      });

      if (insertErr) throw insertErr;
      await refreshFriends();
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send friend request';
      return { success: false, error: msg };
    }
  };

  const respondToRequest = async (
    friendshipId: string,
    action: 'accept' | 'reject'
  ): Promise<{ success: boolean; error?: string }> => {
    if (isDemo) {
      demoStore.respondToFriendRequest(friendshipId, action === 'accept' ? 'accepted' : 'rejected');
      return { success: true };
    }

    try {
      if (action === 'reject') {
        const { error: delErr } = await supabase.from('friendships').delete().eq('id', friendshipId);
        if (delErr) throw delErr;
      } else {
        const { error: updateErr } = await supabase
          .from('friendships')
          .update({ status: 'accepted' })
          .eq('id', friendshipId);
        if (updateErr) throw updateErr;
      }

      await refreshFriends();
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : `Failed to ${action} friend request`;
      return { success: false, error: msg };
    }
  };

  const removeFriend = async (friendshipId: string): Promise<{ success: boolean; error?: string }> => {
    if (isDemo) {
      demoStore.removeFriend(friendshipId);
      return { success: true };
    }

    try {
      const { error: delErr } = await supabase.from('friendships').delete().eq('id', friendshipId);
      if (delErr) throw delErr;
      await refreshFriends();
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
    refreshFriends,
  };
}
