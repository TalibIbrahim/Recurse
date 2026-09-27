import { useState, useEffect, useCallback } from 'react';
import {
  supabase,
  isSupabaseConfigured,
  isDemoModeActive,
  demoStore,
  DEMO_USER_ID,
} from '../lib/supabase';
import { LeaderboardUser, LeaderboardTimeframe, Profile } from '../data/types';
import { SEED_PROBLEMS } from '../data/problemsSeed';

export interface UseLeaderboardReturn {
  readonly leaderboard: readonly LeaderboardUser[];
  readonly timeframe: LeaderboardTimeframe;
  readonly setTimeframe: (tf: LeaderboardTimeframe) => void;
  readonly loading: boolean;
  readonly error: string | null;
  readonly refreshLeaderboard: () => Promise<void>;
}

export function useLeaderboard(currentUserId?: string): UseLeaderboardReturn {
  const [timeframe, setTimeframe] = useState<LeaderboardTimeframe>('week');
  const [leaderboard, setLeaderboard] = useState<readonly LeaderboardUser[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const effectiveUserId = currentUserId || DEMO_USER_ID;
  const isDemo = isDemoModeActive() || !isSupabaseConfigured;

  const calculateDemoLeaderboard = useCallback(() => {
    try {
      // 1. Gather current user + accepted friends
      const friendships = demoStore.getFriendships(effectiveUserId);
      const userIds = [effectiveUserId];
      const profilesMap = new Map<string, Profile>();

      const currentProf = demoStore.getCurrentProfile();
      profilesMap.set(effectiveUserId, currentProf);

      friendships.forEach((f) => {
        if (f.status === 'accepted' && f.friend_profile) {
          userIds.push(f.friend_profile.id);
          profilesMap.set(f.friend_profile.id, f.friend_profile);
        }
      });

      // Filter cutoff date
      const now = new Date();
      let cutoffIso = '';
      if (timeframe === 'today') {
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        cutoffIso = today.toISOString();
      } else if (timeframe === 'week') {
        const dayOfWeek = now.getDay();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
        startOfWeek.setHours(0, 0, 0, 0);
        cutoffIso = startOfWeek.toISOString();
      }

      const probMap = new Map(SEED_PROBLEMS.map((p) => [p.id, p]));

      // 2. Score each user
      const usersData: LeaderboardUser[] = userIds.map((uid) => {
        const profile = profilesMap.get(uid)!;
        const attempts = demoStore.getAttempts(uid);
        const streak = demoStore.getStreak(uid);

        const filteredAttempts = attempts.filter((a) => {
          if (a.status !== 'solved') return false;
          if (!cutoffIso) return true;
          return a.solved_at >= cutoffIso;
        });

        let easyCount = 0;
        let mediumCount = 0;
        let hardCount = 0;

        filteredAttempts.forEach((att) => {
          const prob = att.problem || probMap.get(att.problem_id);
          if (prob?.difficulty === 'Easy') easyCount += 1;
          else if (prob?.difficulty === 'Medium') mediumCount += 1;
          else if (prob?.difficulty === 'Hard') hardCount += 1;
        });

        const points = easyCount * 1 + mediumCount * 3 + hardCount * 5;
        const solvedCount = easyCount + mediumCount + hardCount;

        return {
          rank: 0,
          user_id: uid,
          username: profile.username,
          full_name: profile.full_name,
          avatar_url: profile.avatar_url,
          leetcode_username: profile.leetcode_username,
          points,
          solved_count: solvedCount,
          easy_count: easyCount,
          medium_count: mediumCount,
          hard_count: hardCount,
          current_streak: streak.current_streak,
          is_current_user: uid === effectiveUserId,
        };
      });

      // 3. Sort: points desc -> solved_count desc -> streak desc
      usersData.sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.solved_count !== a.solved_count) return b.solved_count - a.solved_count;
        return b.current_streak - a.current_streak;
      });

      // Assign ranks (1-indexed)
      const ranked: LeaderboardUser[] = usersData.map((u, i) => ({
        ...u,
        rank: i + 1,
      }));

      setLeaderboard(ranked);
      setLoading(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to calculate leaderboard';
      setError(msg);
      setLoading(false);
    }
  }, [effectiveUserId, timeframe]);

  const calculateSupabaseLeaderboard = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Fetch user + friend profiles
      const { data: friendshipsData, error: fsErr } = await supabase
        .from('friendships')
        .select(`
          requester_id,
          addressee_id,
          requester:profiles!requester_id(*),
          addressee:profiles!addressee_id(*)
        `)
        .eq('status', 'accepted')
        .or(`requester_id.eq.${effectiveUserId},addressee_id.eq.${effectiveUserId}`);

      if (fsErr) throw fsErr;

      const profileMap = new Map<string, Profile>();

      // Fetch own profile
      const { data: ownProfile, error: ownProfErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', effectiveUserId)
        .single();

      if (ownProfErr) throw ownProfErr;
      if (ownProfile) {
        profileMap.set(effectiveUserId, ownProfile as Profile);
      }

      if (friendshipsData) {
        friendshipsData.forEach((row: unknown) => {
          const item = row as {
            requester_id: string;
            addressee_id: string;
            requester: Profile;
            addressee: Profile;
          };
          if (item.requester_id === effectiveUserId) {
            profileMap.set(item.addressee_id, item.addressee);
          } else {
            profileMap.set(item.requester_id, item.requester);
          }
        });
      }

      const participantIds = Array.from(profileMap.keys());

      // Filter cutoff
      const now = new Date();
      let cutoffIso: string | null = null;
      if (timeframe === 'today') {
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        cutoffIso = today.toISOString();
      } else if (timeframe === 'week') {
        const dayOfWeek = now.getDay();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
        startOfWeek.setHours(0, 0, 0, 0);
        cutoffIso = startOfWeek.toISOString();
      }

      // 2. Fetch attempts for all participants
      let attemptsQuery = supabase
        .from('attempts')
        .select(`
          user_id,
          status,
          solved_at,
          problems (
            difficulty
          )
        `)
        .in('user_id', participantIds)
        .eq('status', 'solved');

      if (cutoffIso) {
        attemptsQuery = attemptsQuery.gte('solved_at', cutoffIso);
      }

      const { data: attemptsData, error: attErr } = await attemptsQuery;
      if (attErr) throw attErr;

      // 3. Fetch streaks for all participants
      const { data: streaksData } = await supabase
        .from('streaks')
        .select('user_id, current_streak')
        .in('user_id', participantIds);

      const streakMap = new Map<string, number>();
      (streaksData || []).forEach((s: unknown) => {
        const typed = s as { user_id: string; current_streak: number };
        streakMap.set(typed.user_id, typed.current_streak);
      });

      // 4. Aggregate counts per user
      const userCounts = new Map<string, { easy: number; medium: number; hard: number }>();
      participantIds.forEach((uid) => {
        userCounts.set(uid, { easy: 0, medium: 0, hard: 0 });
      });

      (attemptsData || []).forEach((row: unknown) => {
        const item = row as {
          user_id: string;
          problems?: { difficulty: 'Easy' | 'Medium' | 'Hard' };
        };
        const counts = userCounts.get(item.user_id);
        if (counts && item.problems?.difficulty) {
          if (item.problems.difficulty === 'Easy') counts.easy += 1;
          else if (item.problems.difficulty === 'Medium') counts.medium += 1;
          else if (item.problems.difficulty === 'Hard') counts.hard += 1;
        }
      });

      // 5. Score and sort
      const usersData: LeaderboardUser[] = participantIds.map((uid) => {
        const prof = profileMap.get(uid)!;
        const counts = userCounts.get(uid) || { easy: 0, medium: 0, hard: 0 };
        const points = counts.easy * 1 + counts.medium * 3 + counts.hard * 5;
        const solvedCount = counts.easy + counts.medium + counts.hard;
        const currentStreak = streakMap.get(uid) || 0;

        return {
          rank: 0,
          user_id: uid,
          username: prof.username,
          full_name: prof.full_name,
          avatar_url: prof.avatar_url,
          leetcode_username: prof.leetcode_username,
          points,
          solved_count: solvedCount,
          easy_count: counts.easy,
          medium_count: counts.medium,
          hard_count: counts.hard,
          current_streak: currentStreak,
          is_current_user: uid === effectiveUserId,
        };
      });

      usersData.sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.solved_count !== a.solved_count) return b.solved_count - a.solved_count;
        return b.current_streak - a.current_streak;
      });

      const ranked: LeaderboardUser[] = usersData.map((u, i) => ({
        ...u,
        rank: i + 1,
      }));

      setLeaderboard(ranked);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error fetching leaderboard';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [effectiveUserId, timeframe]);

  const refreshLeaderboard = useCallback(async () => {
    if (isDemo) {
      calculateDemoLeaderboard();
    } else {
      await calculateSupabaseLeaderboard();
    }
  }, [isDemo, calculateDemoLeaderboard, calculateSupabaseLeaderboard]);

  useEffect(() => {
    if (isDemo) {
      calculateDemoLeaderboard();
      const unsubAttempts = demoStore.subscribe('attempts', calculateDemoLeaderboard);
      const unsubFriends = demoStore.subscribe('friendships', calculateDemoLeaderboard);
      return () => {
        unsubAttempts();
        unsubFriends();
      };
    } else {
      calculateSupabaseLeaderboard();
    }
  }, [isDemo, calculateDemoLeaderboard, calculateSupabaseLeaderboard, timeframe]);

  return {
    leaderboard,
    timeframe,
    setTimeframe,
    loading,
    error,
    refreshLeaderboard,
  };
}
