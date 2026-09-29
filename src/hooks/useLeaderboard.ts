import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { LeaderboardUser, LeaderboardTimeframe, Profile } from '../data/types';
import { hydrateAttempts, effectiveStreak, startOfLocalDayIso, startOfLocalWeekIso, DIFFICULTY_POINTS } from '../lib/problems';
import { useDataRefresh } from '../lib/dataSync';

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

  const calculateSupabaseLeaderboard = useCallback(async () => {
    if (!currentUserId) {
      setLeaderboard([]);
      setLoading(false);
      return;
    }

    try {
      setError(null);

      // 1. Fetch user + friend profiles
      const { data: friendshipsData } = await supabase
        .from('friendships')
        .select(`
          requester_id,
          addressee_id,
          requester:profiles!requester_id(*),
          addressee:profiles!addressee_id(*)
        `)
        .eq('status', 'accepted')
        .or(`requester_id.eq.${currentUserId},addressee_id.eq.${currentUserId}`);

      const profileMap = new Map<string, Profile>();

      // Fetch own profile
      const { data: ownProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUserId)
        .maybeSingle();

      if (ownProfile) {
        profileMap.set(currentUserId, ownProfile as Profile);
      }

      if (friendshipsData) {
        friendshipsData.forEach((row: unknown) => {
          const item = row as {
            requester_id: string;
            addressee_id: string;
            requester: Profile;
            addressee: Profile;
          };
          if (item.requester_id === currentUserId) {
            if (item.addressee) profileMap.set(item.addressee_id, item.addressee);
          } else {
            if (item.requester) profileMap.set(item.requester_id, item.requester);
          }
        });
      }

      const participantIds = Array.from(profileMap.keys());
      if (participantIds.length === 0) {
        setLeaderboard([]);
        setLoading(false);
        return;
      }

      // Filter cutoff
      let cutoffIso: string | null = null;
      if (timeframe === 'today') {
        cutoffIso = startOfLocalDayIso();
      } else if (timeframe === 'week') {
        cutoffIso = startOfLocalWeekIso();
      }

      // 2. Fetch attempts for all participants
      let attemptsQuery = supabase
        .from('attempts')
        .select('*')
        .in('user_id', participantIds)
        .eq('status', 'solved');

      if (cutoffIso) {
        attemptsQuery = attemptsQuery.gte('solved_at', cutoffIso);
      }

      const { data: attemptsData, error: attErr } = await attemptsQuery;
      if (attErr) throw attErr;

      // 3. Fetch streaks for all participants
      const { data: streaksData, error: streakErr } = await supabase
        .from('streaks')
        .select('user_id, current_streak, last_active_date')
        .in('user_id', participantIds);

      if (streakErr) throw streakErr;

      const streakMap = new Map<string, number>();
      if (streaksData) {
        streaksData.forEach((s) =>
          streakMap.set(s.user_id, effectiveStreak(s.current_streak, s.last_active_date))
        );
      }
      const solves = hydrateAttempts(attemptsData);

      // 4. Aggregate metrics
      const usersData: LeaderboardUser[] = participantIds.map((uid) => {
        const prof = profileMap.get(uid);
        const userAttempts = solves.filter((a) => a.user_id === uid);

        let easyCount = 0;
        let mediumCount = 0;
        let hardCount = 0;

        userAttempts.forEach((a) => {
          const diff = a.problem!.difficulty;
          if (diff === 'Easy') easyCount++;
          else if (diff === 'Hard') hardCount++;
          else mediumCount++;
        });

        const totalSolves = easyCount + mediumCount + hardCount;
        const totalPoints =
          easyCount * DIFFICULTY_POINTS.Easy +
          mediumCount * DIFFICULTY_POINTS.Medium +
          hardCount * DIFFICULTY_POINTS.Hard;
        const currentStreak = streakMap.get(uid) || 0;

        return {
          rank: 0,
          user_id: uid,
          username: prof?.username || 'user',
          full_name: prof?.full_name || 'Coder',
          avatar_url: prof?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
          leetcode_username: prof?.leetcode_username || null,
          identity_label: prof?.identity_label,
          solved_count: totalSolves,
          easy_count: easyCount,
          medium_count: mediumCount,
          hard_count: hardCount,
          points: totalPoints,
          current_streak: currentStreak,
          is_current_user: uid === currentUserId,
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
  }, [currentUserId, timeframe]);

  useEffect(() => {
    calculateSupabaseLeaderboard();
  }, [calculateSupabaseLeaderboard, timeframe]);

  useDataRefresh(calculateSupabaseLeaderboard, Boolean(currentUserId));

  return {
    leaderboard,
    timeframe,
    setTimeframe,
    loading,
    error,
    refreshLeaderboard: calculateSupabaseLeaderboard,
  };
}

export default useLeaderboard;
