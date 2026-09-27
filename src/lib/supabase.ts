import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  Profile,
  DailyGoal,
  Friendship,
  Attempt,
  Streak,
  ProblemComment,
  GoalPresetType,
  GoalCadence,
  LogAttemptInput,
  FriendPoke,
  Duel,
  DuelStatus,
  Badge,
  WeeklyRecap,
} from '../data/types';
import { SEED_PROBLEMS, ALL_BADGES } from '../data/problemsSeed';

// ============================================================================
// Environment & Supabase Client Initialization
// ============================================================================

const envUrl = (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_SUPABASE_URL || '';
const envKey = (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_SUPABASE_ANON_KEY || '';

const isPlaceholderUrl =
  !envUrl ||
  envUrl.includes('placeholder') ||
  envUrl.includes('YOUR_SUPABASE') ||
  !envUrl.startsWith('http');

export const isSupabaseConfigured = Boolean(envUrl && envKey && !isPlaceholderUrl);

// Safe initialization of the Supabase client
const dummyUrl = 'https://demo-codegrind-placeholder.supabase.co';
const dummyKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy_anon_key_for_codegrind_preview';

export const supabase: SupabaseClient = createClient(
  isSupabaseConfigured ? envUrl : dummyUrl,
  isSupabaseConfigured ? envKey : dummyKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  }
);

// ============================================================================
// Mock / Demo Store Implementation
// ============================================================================

const STORAGE_KEY = 'codegrind_demo_store_v1';
const DEMO_ACTIVE_KEY = 'codegrind_demo_mode_active';

export interface DemoStoreState {
  profiles: Profile[];
  friendships: Friendship[];
  dailyGoals: DailyGoal[];
  attempts: Attempt[];
  streaks: Streak[];
  comments: ProblemComment[];
  pokes: FriendPoke[];
  duels: Duel[];
  currentUserId: string;
}

// Fixed UUIDs for predictable relationships in demo mode
export const DEMO_USER_ID = '00000000-0000-4000-a000-000000000001';
export const FRIEND_SARAH_ID = '00000000-0000-4000-a000-000000000002';
export const FRIEND_DAVID_ID = '00000000-0000-4000-a000-000000000003';
export const FRIEND_ELENA_ID = '00000000-0000-4000-a000-000000000004';
export const STRANGER_MARCUS_ID = '00000000-0000-4000-a000-000000000005';
export const STRANGER_MAYA_ID = '00000000-0000-4000-a000-000000000006';

function getTodayString(): string {
  const d = new Date();
  return d.toISOString().split('T')[0];
}

function getOffsetDateString(daysOffset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  return d.toISOString().split('T')[0];
}

function getOffsetIsoString(daysOffset: number, hoursOffset: number = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  d.setHours(d.getHours() + hoursOffset);
  return d.toISOString();
}

export function buildDefaultDemoState(): DemoStoreState {
  const todayStr = getTodayString();

  const profiles: Profile[] = [
    {
      id: DEMO_USER_ID,
      username: 'alex_grind',
      full_name: 'Alex Chen',
      avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      bio: 'Cracking FAANG interview prep. Focused on Patterns & NeetCode 150.',
      leetcode_username: 'alexchen_dev',
      identity_label: {
        title: 'Consistent Grinder',
        description: 'Active 6-day streak with daily discipline',
        category: 'consistency',
      },
      is_online: true,
      last_seen_at: new Date().toISOString(),
      created_at: getOffsetIsoString(-60),
      updated_at: new Date().toISOString(),
    },
    {
      id: FRIEND_SARAH_ID,
      username: 'sarah_codes',
      full_name: 'Sarah Lin',
      avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
      bio: 'Software engineer @ Berkeley. Daily DP & Graph grinder.',
      leetcode_username: 'sarah_lin',
      identity_label: {
        title: 'DP Specialist',
        description: 'Mastering dynamic programming patterns',
        category: 'specialist',
      },
      is_online: true,
      last_seen_at: new Date().toISOString(),
      created_at: getOffsetIsoString(-90),
      updated_at: new Date().toISOString(),
    },
    {
      id: FRIEND_DAVID_ID,
      username: 'david_k',
      full_name: 'David Kim',
      avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      bio: 'Practicing trees and system design. Aiming for Google L4.',
      leetcode_username: 'david_kim_dev',
      identity_label: {
        title: 'The Comeback',
        description: 'Resumed strong practice momentum after break',
        category: 'resilience',
      },
      is_online: true,
      last_seen_at: new Date().toISOString(),
      created_at: getOffsetIsoString(-45),
      updated_at: new Date().toISOString(),
    },
    {
      id: FRIEND_ELENA_ID,
      username: 'elena_algo',
      full_name: 'Elena Rostova',
      avatar_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150',
      bio: 'Math & competitive programming background. 23-day streak!',
      leetcode_username: 'elena_r',
      identity_label: {
        title: 'Deep Diver',
        description: 'Tackles complex Hard challenges',
        category: 'pace',
      },
      is_online: false,
      last_seen_at: getOffsetIsoString(0, -3),
      created_at: getOffsetIsoString(-120),
      updated_at: new Date().toISOString(),
    },
    {
      id: STRANGER_MARCUS_ID,
      username: 'marcus_v',
      full_name: 'Marcus Vance',
      avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
      bio: 'Fullstack developer exploring Blind 75.',
      leetcode_username: 'marcus_vance',
      is_online: false,
      last_seen_at: getOffsetIsoString(-1),
      created_at: getOffsetIsoString(-15),
      updated_at: new Date().toISOString(),
    },
    {
      id: STRANGER_MAYA_ID,
      username: 'maya_p',
      full_name: 'Maya Patel',
      avatar_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150',
      bio: 'Passionate about algorithms and distributed systems.',
      leetcode_username: 'maya_patel',
      is_online: true,
      last_seen_at: new Date().toISOString(),
      created_at: getOffsetIsoString(-20),
      updated_at: new Date().toISOString(),
    },
  ];

  const friendships: Friendship[] = [
    {
      id: 'f-1',
      requester_id: DEMO_USER_ID,
      addressee_id: FRIEND_SARAH_ID,
      status: 'accepted',
      created_at: getOffsetIsoString(-40),
      updated_at: getOffsetIsoString(-40),
      friend_profile: profiles[1],
    },
    {
      id: 'f-2',
      requester_id: FRIEND_DAVID_ID,
      addressee_id: DEMO_USER_ID,
      status: 'accepted',
      created_at: getOffsetIsoString(-30),
      updated_at: getOffsetIsoString(-30),
      friend_profile: profiles[2],
    },
    {
      id: 'f-3',
      requester_id: DEMO_USER_ID,
      addressee_id: FRIEND_ELENA_ID,
      status: 'accepted',
      created_at: getOffsetIsoString(-25),
      updated_at: getOffsetIsoString(-25),
      friend_profile: profiles[3],
    },
    {
      id: 'f-4',
      requester_id: DEMO_USER_ID,
      addressee_id: STRANGER_MARCUS_ID,
      status: 'pending',
      created_at: getOffsetIsoString(-2),
      updated_at: getOffsetIsoString(-2),
      friend_profile: profiles[4],
    },
    {
      id: 'f-5',
      requester_id: STRANGER_MAYA_ID,
      addressee_id: DEMO_USER_ID,
      status: 'pending',
      created_at: getOffsetIsoString(-1),
      updated_at: getOffsetIsoString(-1),
      friend_profile: profiles[5],
    },
  ];

  const dailyGoals: DailyGoal[] = [
    {
      id: 'dg-1',
      user_id: DEMO_USER_ID,
      preset: 'Standard',
      cadence: 'both',
      easy_target: 1,
      medium_target: 1,
      hard_target: 0,
      weekly_target: 10,
      effective_from: todayStr,
      created_at: getOffsetIsoString(-10),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'dg-2',
      user_id: FRIEND_SARAH_ID,
      preset: 'Grinder',
      cadence: 'both',
      easy_target: 2,
      medium_target: 2,
      hard_target: 1,
      weekly_target: 14,
      effective_from: todayStr,
      created_at: getOffsetIsoString(-30),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'dg-3',
      user_id: FRIEND_DAVID_ID,
      preset: 'Standard',
      cadence: 'daily',
      easy_target: 1,
      medium_target: 1,
      hard_target: 0,
      weekly_target: 7,
      effective_from: todayStr,
      created_at: getOffsetIsoString(-20),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'dg-4',
      user_id: FRIEND_ELENA_ID,
      preset: 'Grinder',
      cadence: 'both',
      easy_target: 2,
      medium_target: 2,
      hard_target: 1,
      weekly_target: 15,
      effective_from: todayStr,
      created_at: getOffsetIsoString(-40),
      updated_at: new Date().toISOString(),
    },
  ];

  const streaks: Streak[] = [
    {
      user_id: DEMO_USER_ID,
      current_streak: 6,
      longest_streak: 15,
      last_active_date: todayStr,
      freezes_available: 2,
      freezes_used: 0,
      last_freeze_date: null,
      is_at_risk: true,
      updated_at: new Date().toISOString(),
    },
    {
      user_id: FRIEND_SARAH_ID,
      current_streak: 14,
      longest_streak: 21,
      last_active_date: todayStr,
      freezes_available: 2,
      freezes_used: 0,
      last_freeze_date: null,
      is_at_risk: false,
      updated_at: new Date().toISOString(),
    },
    {
      user_id: FRIEND_DAVID_ID,
      current_streak: 7,
      longest_streak: 12,
      last_active_date: todayStr,
      freezes_available: 1,
      freezes_used: 1,
      last_freeze_date: getOffsetDateString(-3),
      is_at_risk: false,
      updated_at: new Date().toISOString(),
    },
    {
      user_id: FRIEND_ELENA_ID,
      current_streak: 23,
      longest_streak: 34,
      last_active_date: todayStr,
      freezes_available: 2,
      freezes_used: 0,
      last_freeze_date: null,
      is_at_risk: false,
      updated_at: new Date().toISOString(),
    },
  ];

  // Helper to find seed problem by slug
  const probMap = new Map(SEED_PROBLEMS.map((p) => [p.leetcode_slug, p]));

  const attempts: Attempt[] = [
    // Alex Chen today
    {
      id: 'att-1',
      user_id: DEMO_USER_ID,
      problem_id: probMap.get('two-sum')?.id || 'prob-1',
      status: 'solved',
      approach_notes: 'Single-pass hash table storing complement as key and index as value. Avoided nested loops.',
      pattern_tag: 'Hash Table',
      time_complexity: 'O(N)',
      space_complexity: 'O(N)',
      time_spent_min: 12,
      submission_url: 'https://leetcode.com/problems/two-sum/submissions/',
      solved_at: getOffsetIsoString(0, -2),
      needs_revisit: false,
      revisit_by: null,
      created_at: getOffsetIsoString(0, -2),
      updated_at: getOffsetIsoString(0, -2),
      problem: probMap.get('two-sum'),
      user: profiles[0],
    },
    {
      id: 'att-2',
      user_id: DEMO_USER_ID,
      problem_id: probMap.get('group-anagrams')?.id || 'prob-3',
      status: 'solved',
      approach_notes: 'Character frequency count tuple (26 elements) as hash map key to group words in linear time.',
      pattern_tag: 'Hash Table',
      time_complexity: 'O(N * K)',
      space_complexity: 'O(N * K)',
      time_spent_min: 24,
      submission_url: 'https://leetcode.com/problems/group-anagrams/submissions/',
      solved_at: getOffsetIsoString(0, -1),
      needs_revisit: false,
      revisit_by: null,
      created_at: getOffsetIsoString(0, -1),
      updated_at: getOffsetIsoString(0, -1),
      problem: probMap.get('group-anagrams'),
      user: profiles[0],
    },
    // Alex needs review problem from 4 days ago
    {
      id: 'att-3',
      user_id: DEMO_USER_ID,
      problem_id: probMap.get('trapping-rain-water')?.id || 'prob-11',
      status: 'needs_review',
      approach_notes: 'Two-pointer solution keeping leftMax and rightMax bounds. Tripped up on boundary equality condition.',
      pattern_tag: 'Two Pointers',
      time_complexity: 'O(N)',
      space_complexity: 'O(1)',
      time_spent_min: 45,
      submission_url: 'https://leetcode.com/problems/trapping-rain-water/submissions/',
      solved_at: getOffsetIsoString(-4),
      needs_revisit: true,
      revisit_by: getOffsetIsoString(1),
      created_at: getOffsetIsoString(-4),
      updated_at: getOffsetIsoString(-4),
      problem: probMap.get('trapping-rain-water'),
      user: profiles[0],
    },
    {
      id: 'att-4',
      user_id: DEMO_USER_ID,
      problem_id: probMap.get('coin-change')?.id || 'prob-54',
      status: 'solved',
      approach_notes: 'Bottom-up DP table initialized to amount + 1. dp[i] = min(dp[i], dp[i - coin] + 1).',
      pattern_tag: 'Dynamic Programming',
      time_complexity: 'O(amount * coins)',
      space_complexity: 'O(amount)',
      time_spent_min: 30,
      submission_url: 'https://leetcode.com/problems/coin-change/submissions/',
      solved_at: getOffsetIsoString(-5),
      needs_revisit: true,
      revisit_by: getOffsetIsoString(-1),
      created_at: getOffsetIsoString(-5),
      updated_at: getOffsetIsoString(-5),
      problem: probMap.get('coin-change'),
      user: profiles[0],
    },
    // Sarah's attempts
    {
      id: 'att-5',
      user_id: FRIEND_SARAH_ID,
      problem_id: probMap.get('course-schedule')?.id || 'prob-46',
      status: 'solved',
      approach_notes: 'Kahn algorithm for topological sorting using in-degree array and queue. Cycle detected if count < numCourses.',
      pattern_tag: 'Topological Sort',
      time_complexity: 'O(V + E)',
      space_complexity: 'O(V + E)',
      time_spent_min: 28,
      submission_url: 'https://leetcode.com/problems/course-schedule/submissions/',
      solved_at: getOffsetIsoString(0, -3),
      needs_revisit: false,
      revisit_by: null,
      created_at: getOffsetIsoString(0, -3),
      updated_at: getOffsetIsoString(0, -3),
      problem: probMap.get('course-schedule'),
      user: profiles[1],
    },
    {
      id: 'att-6',
      user_id: FRIEND_SARAH_ID,
      problem_id: probMap.get('number-of-islands')?.id || 'prob-43',
      status: 'solved',
      approach_notes: 'Standard DFS sink island approach. Mutate grid to 0 in-place to save visited set space.',
      pattern_tag: 'Depth-First Search',
      time_complexity: 'O(M * N)',
      space_complexity: 'O(M * N)',
      time_spent_min: 18,
      submission_url: 'https://leetcode.com/problems/number-of-islands/submissions/',
      solved_at: getOffsetIsoString(0, -5),
      needs_revisit: false,
      revisit_by: null,
      created_at: getOffsetIsoString(0, -5),
      updated_at: getOffsetIsoString(0, -5),
      problem: probMap.get('number-of-islands'),
      user: profiles[1],
    },
    // David's attempt
    {
      id: 'att-7',
      user_id: FRIEND_DAVID_ID,
      problem_id: probMap.get('invert-binary-tree')?.id || 'prob-31',
      status: 'solved',
      approach_notes: 'Classic recursive swap: left and right children swapped before recursion.',
      pattern_tag: 'Binary Tree',
      time_complexity: 'O(N)',
      space_complexity: 'O(H)',
      time_spent_min: 8,
      submission_url: 'https://leetcode.com/problems/invert-binary-tree/submissions/',
      solved_at: getOffsetIsoString(0, -4),
      needs_revisit: false,
      revisit_by: null,
      created_at: getOffsetIsoString(0, -4),
      updated_at: getOffsetIsoString(0, -4),
      problem: probMap.get('invert-binary-tree'),
      user: profiles[2],
    },
  ];

  // Add historical solves across past weeks for rich heatmap data
  const sampleProblems = SEED_PROBLEMS.slice(0, 25);
  for (let i = 1; i <= 60; i++) {
    // Generate solve on ~65% of days to create realistic streaks
    if (i % 7 !== 0 && i % 5 !== 0) {
      const p = sampleProblems[i % sampleProblems.length];
      attempts.push({
        id: `att-hist-${i}`,
        user_id: DEMO_USER_ID,
        problem_id: p.id,
        status: 'solved',
        approach_notes: `Solved during consistency sprint. Focus on ${p.tags[0] || 'Pattern'}.`,
        pattern_tag: p.tags[0] || 'General',
        time_complexity: 'O(N)',
        space_complexity: 'O(1)',
        time_spent_min: 20,
        submission_url: p.url,
        solved_at: getOffsetIsoString(-i, -4),
        needs_revisit: false,
        revisit_by: null,
        confidence_rating: (((i * 3) % 5) + 1) as 1 | 2 | 3 | 4 | 5,
        created_at: getOffsetIsoString(-i, -4),
        updated_at: getOffsetIsoString(-i, -4),
        problem: p,
        user: profiles[0],
      });
    }
  }

  const comments: ProblemComment[] = [
    {
      id: 'comm-1',
      attempt_id: 'att-3',
      author_id: FRIEND_SARAH_ID,
      body: 'Trapping Rain Water is notorious for off-by-one errors! The monotonic stack approach also makes visualizing it much easier.',
      created_at: getOffsetIsoString(-3),
      updated_at: getOffsetIsoString(-3),
      author: profiles[1],
    },
    {
      id: 'comm-2',
      attempt_id: 'att-3',
      author_id: DEMO_USER_ID,
      body: 'Totally, good call Sarah! Going to retry this one without looking at the notes on Sunday.',
      created_at: getOffsetIsoString(-2),
      updated_at: getOffsetIsoString(-2),
      author: profiles[0],
    },
    {
      id: 'comm-3',
      attempt_id: 'att-5',
      author_id: DEMO_USER_ID,
      body: 'Clean Kahn algorithm implementation! Did you benchmark it against DFS post-order cycle detection?',
      created_at: getOffsetIsoString(0, -2),
      updated_at: getOffsetIsoString(0, -2),
      author: profiles[0],
    },
  ];

  const pokes: FriendPoke[] = [
    {
      id: 'poke-1',
      sender_id: FRIEND_SARAH_ID,
      receiver_id: DEMO_USER_ID,
      poked_at: getOffsetIsoString(0, -3),
      message: 'Time to grind! You have 1 solve left for your daily goal.',
      sender: profiles[1],
      receiver: profiles[0],
    },
    {
      id: 'poke-2',
      sender_id: FRIEND_DAVID_ID,
      receiver_id: DEMO_USER_ID,
      poked_at: getOffsetIsoString(-2, 0),
      message: 'Check out the new Graph problems!',
      sender: profiles[2],
      receiver: profiles[0],
    },
  ];

  const duels: Duel[] = [
    {
      id: 'duel-1',
      challenger_id: DEMO_USER_ID,
      opponent_id: FRIEND_SARAH_ID,
      problem_id: probMap.get('invert-binary-tree')?.id || 'prob-31',
      status: 'completed',
      challenger_time_sec: 245,
      opponent_time_sec: 310,
      winner_id: DEMO_USER_ID,
      start_time: getOffsetIsoString(-1, -2),
      end_time: getOffsetIsoString(-1, -1),
      created_at: getOffsetIsoString(-1, -3),
      problem: probMap.get('invert-binary-tree'),
      challenger: profiles[0],
      opponent: profiles[1],
    },
    {
      id: 'duel-2',
      challenger_id: FRIEND_DAVID_ID,
      opponent_id: DEMO_USER_ID,
      problem_id: probMap.get('two-sum')?.id || 'prob-1',
      status: 'pending',
      challenger_time_sec: null,
      opponent_time_sec: null,
      winner_id: null,
      start_time: null,
      end_time: null,
      created_at: getOffsetIsoString(0, -1),
      problem: probMap.get('two-sum'),
      challenger: profiles[2],
      opponent: profiles[0],
    },
  ];

  return {
    profiles,
    friendships,
    dailyGoals,
    attempts,
    streaks,
    comments,
    pokes,
    duels,
    currentUserId: DEMO_USER_ID,
  };
}

// ============================================================================
// Demo Store Class with LocalStorage Persistence & PubSub Event Dispatch
// ============================================================================

type Listener = () => void;

class DemoStore {
  private state: DemoStoreState;
  private listeners: Map<string, Set<Listener>> = new Map();

  constructor() {
    this.state = this.loadState();
  }

  private loadState(): DemoStoreState {
    if (typeof window === 'undefined') {
      return buildDefaultDemoState();
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.profiles) && Array.isArray(parsed.attempts)) {
          // Re-attach problem objects to attempts if missing
          const probMap = new Map(SEED_PROBLEMS.map((p) => [p.id, p]));
          const userMap = new Map((parsed.profiles || []).map((p: Profile) => [p.id, p]));
          const defaults = buildDefaultDemoState();

          parsed.attempts = parsed.attempts.map((att: Attempt) => ({
            ...att,
            problem: att.problem || probMap.get(att.problem_id),
          }));
          parsed.pokes = Array.isArray(parsed.pokes)
            ? parsed.pokes.map((p: FriendPoke) => ({
                ...p,
                sender: p.sender || userMap.get(p.sender_id),
                receiver: p.receiver || userMap.get(p.receiver_id),
              }))
            : defaults.pokes;
          parsed.duels = Array.isArray(parsed.duels)
            ? parsed.duels.map((d: Duel) => ({
                ...d,
                problem: d.problem || probMap.get(d.problem_id),
                challenger: d.challenger || userMap.get(d.challenger_id),
                opponent: d.opponent || userMap.get(d.opponent_id),
              }))
            : defaults.duels;
          return parsed;
        }
      }
    } catch {
      // Fallback
    }
    return buildDefaultDemoState();
  }

  private persistState(): void {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
      } catch (err) {
        console.error('Failed to persist CodeGrind demo store:', err);
      }
    }
  }

  private emit(event: string): void {
    const bucket = this.listeners.get(event);
    if (bucket) {
      bucket.forEach((listener) => {
        try {
          listener();
        } catch (err) {
          console.error(`Error in demo store listener for ${event}:`, err);
        }
      });
    }
    // Also trigger general change listeners
    const wildcard = this.listeners.get('*');
    if (wildcard) {
      wildcard.forEach((l) => l());
    }
  }

  public subscribe(event: string, callback: Listener): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  // --- Auth & Session State ---
  public getCurrentUserId(): string {
    return this.state.currentUserId;
  }

  public setCurrentUserId(userId: string): void {
    this.state.currentUserId = userId;
    this.persistState();
    this.emit('auth');
  }

  public getCurrentProfile(): Profile {
    const found = this.state.profiles.find((p) => p.id === this.state.currentUserId);
    if (found) return found;
    return this.state.profiles[0];
  }

  public updateProfile(userId: string, updates: Partial<Profile>): Profile {
    this.state.profiles = this.state.profiles.map((p) => {
      if (p.id === userId) {
        return {
          ...p,
          ...updates,
          updated_at: new Date().toISOString(),
        };
      }
      return p;
    });
    this.persistState();
    this.emit('profiles');
    this.emit('auth');
    return this.getCurrentProfile();
  }

  public searchProfiles(query: string): Profile[] {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return this.state.profiles.filter(
      (p) =>
        p.id !== this.state.currentUserId &&
        (p.username.toLowerCase().includes(q) ||
          p.full_name.toLowerCase().includes(q) ||
          (p.leetcode_username && p.leetcode_username.toLowerCase().includes(q)))
    );
  }

  // --- Daily Goal Management ---
  public getDailyGoal(userId: string = this.state.currentUserId): DailyGoal {
    const todayStr = getTodayString();
    let goal = this.state.dailyGoals.find((g) => g.user_id === userId && g.effective_from === todayStr);
    if (!goal) {
      // Find latest goal for user
      const userGoals = this.state.dailyGoals.filter((g) => g.user_id === userId);
      if (userGoals.length > 0) {
        const latest = userGoals[userGoals.length - 1];
        goal = {
          ...latest,
          cadence: latest.cadence || 'both',
          weekly_target: latest.weekly_target || 10,
        };
      } else {
        goal = {
          id: `dg-${Date.now()}`,
          user_id: userId,
          preset: 'Standard',
          cadence: 'both',
          easy_target: 1,
          medium_target: 1,
          hard_target: 0,
          weekly_target: 10,
          effective_from: todayStr,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        this.state.dailyGoals.push(goal);
        this.persistState();
      }
    } else {
      if (!goal.cadence || !goal.weekly_target) {
        goal = {
          ...goal,
          cadence: goal.cadence || 'both',
          weekly_target: goal.weekly_target || 10,
        };
      }
    }
    return goal;
  }

  public setDailyGoal(
    userId: string,
    preset: GoalPresetType,
    easy: number,
    medium: number,
    hard: number,
    cadence: GoalCadence = 'both',
    weeklyTarget: number = 10
  ): DailyGoal {
    const todayStr = getTodayString();
    const existingIndex = this.state.dailyGoals.findIndex(
      (g) => g.user_id === userId && g.effective_from === todayStr
    );

    const updatedGoal: DailyGoal = {
      id: existingIndex >= 0 ? this.state.dailyGoals[existingIndex].id : `dg-${Date.now()}`,
      user_id: userId,
      preset,
      cadence,
      easy_target: Math.max(0, easy),
      medium_target: Math.max(0, medium),
      hard_target: Math.max(0, hard),
      weekly_target: Math.max(1, weeklyTarget),
      effective_from: todayStr,
      created_at: existingIndex >= 0 ? this.state.dailyGoals[existingIndex].created_at : new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      this.state.dailyGoals[existingIndex] = updatedGoal;
    } else {
      this.state.dailyGoals.push(updatedGoal);
    }

    this.persistState();
    this.emit('daily_goals');
    return updatedGoal;
  }

  // --- Ambient Friend Goal (Gentle Companion Ring) ---
  public getAmbientFriendGoal(userId: string = this.state.currentUserId): {
    friend: Profile;
    solved_today: number;
    daily_target: number;
    current_streak: number;
    is_complete: boolean;
    weekly_solved: number;
    weekly_target: number;
  } | null {
    const acceptedFriendships = this.state.friendships.filter(
      (f) => f.status === 'accepted' && (f.requester_id === userId || f.addressee_id === userId)
    );
    if (acceptedFriendships.length === 0) return null;

    const todayStr = getTodayString();
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    for (const f of acceptedFriendships) {
      const friendId = f.requester_id === userId ? f.addressee_id : f.requester_id;
      const friendProfile = this.state.profiles.find((p) => p.id === friendId);
      if (!friendProfile) continue;

      const friendSolvesToday = this.state.attempts.filter(
        (a) => a.user_id === friendId && a.status === 'solved' && a.solved_at.startsWith(todayStr)
      ).length;

      const friendSolvesWeek = this.state.attempts.filter(
        (a) => a.user_id === friendId && a.status === 'solved' && new Date(a.solved_at).getTime() >= sevenDaysAgo
      ).length;

      const friendGoal = this.getDailyGoal(friendId);
      const friendStreak = this.getStreak(friendId);
      const dailyTarget = friendGoal.easy_target + friendGoal.medium_target + friendGoal.hard_target;

      return {
        friend: friendProfile,
        solved_today: friendSolvesToday,
        daily_target: dailyTarget || 2,
        current_streak: friendStreak.current_streak,
        is_complete: friendSolvesToday >= (dailyTarget || 2),
        weekly_solved: friendSolvesWeek,
        weekly_target: friendGoal.weekly_target || 10,
      };
    }
    return null;
  }

  // --- Friends Management ---
  public getFriendships(userId: string = this.state.currentUserId): Friendship[] {
    const userFriendships = this.state.friendships.filter(
      (f) => f.requester_id === userId || f.addressee_id === userId
    );

    return userFriendships.map((f) => {
      const otherId = f.requester_id === userId ? f.addressee_id : f.requester_id;
      const otherProfile = this.state.profiles.find((p) => p.id === otherId);
      return {
        ...f,
        friend_profile: otherProfile,
      };
    });
  }

  public sendFriendRequest(requesterId: string, addresseeId: string): Friendship {
    // Check existing
    const existing = this.state.friendships.find(
      (f) =>
        (f.requester_id === requesterId && f.addressee_id === addresseeId) ||
        (f.requester_id === addresseeId && f.addressee_id === requesterId)
    );
    if (existing) {
      return existing;
    }

    const otherProfile = this.state.profiles.find((p) => p.id === addresseeId);
    const newFriendship: Friendship = {
      id: `f-${Date.now()}`,
      requester_id: requesterId,
      addressee_id: addresseeId,
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      friend_profile: otherProfile,
    };

    this.state.friendships.push(newFriendship);
    this.persistState();
    this.emit('friendships');
    return newFriendship;
  }

  public respondToFriendRequest(friendshipId: string, status: 'accepted' | 'rejected'): Friendship | null {
    let result: Friendship | null = null;
    this.state.friendships = this.state.friendships.map((f) => {
      if (f.id === friendshipId) {
        result = {
          ...f,
          status,
          updated_at: new Date().toISOString(),
        };
        return result;
      }
      return f;
    });

    this.persistState();
    this.emit('friendships');
    return result;
  }

  public removeFriend(friendshipId: string): void {
    this.state.friendships = this.state.friendships.filter((f) => f.id !== friendshipId);
    this.persistState();
    this.emit('friendships');
  }

  // --- Attempts & Solves Management ---
  public getAttempts(userId: string = this.state.currentUserId): Attempt[] {
    const probMap = new Map(SEED_PROBLEMS.map((p) => [p.id, p]));
    const userMap = new Map(this.state.profiles.map((p) => [p.id, p]));

    return this.state.attempts
      .filter((a) => a.user_id === userId)
      .map((a) => ({
        ...a,
        problem: a.problem || probMap.get(a.problem_id),
        user: a.user || userMap.get(a.user_id),
      }))
      .sort((a, b) => new Date(b.solved_at).getTime() - new Date(a.solved_at).getTime());
  }

  public getFriendAttempts(userId: string = this.state.currentUserId): Attempt[] {
    // Get accepted friend IDs
    const acceptedFriendIds = new Set(
      this.state.friendships
        .filter((f) => f.status === 'accepted' && (f.requester_id === userId || f.addressee_id === userId))
        .map((f) => (f.requester_id === userId ? f.addressee_id : f.requester_id))
    );

    const probMap = new Map(SEED_PROBLEMS.map((p) => [p.id, p]));
    const userMap = new Map(this.state.profiles.map((p) => [p.id, p]));

    return this.state.attempts
      .filter((a) => acceptedFriendIds.has(a.user_id))
      .map((a) => ({
        ...a,
        problem: a.problem || probMap.get(a.problem_id),
        user: a.user || userMap.get(a.user_id),
      }))
      .sort((a, b) => new Date(b.solved_at).getTime() - new Date(a.solved_at).getTime());
  }

  public addAttempt(userId: string, input: LogAttemptInput): Attempt {
    const probMap = new Map(SEED_PROBLEMS.map((p) => [p.id, p]));
    const problem = probMap.get(input.problem_id);
    const user = this.state.profiles.find((p) => p.id === userId);

    const nowIso = new Date().toISOString();
    const newAttempt: Attempt = {
      id: `att-${Date.now()}`,
      user_id: userId,
      problem_id: input.problem_id,
      status: input.status,
      approach_notes: input.approach_notes || '',
      pattern_tag: input.pattern_tag || null,
      time_complexity: input.time_complexity || null,
      space_complexity: input.space_complexity || null,
      time_spent_min: input.time_spent_min ?? null,
      submission_url: input.submission_url || null,
      solved_at: nowIso,
      needs_revisit: input.needs_revisit ?? (input.status === 'needs_review'),
      revisit_by: input.needs_revisit ? getOffsetIsoString(3) : null,
      confidence_rating: input.confidence_rating,
      created_at: nowIso,
      updated_at: nowIso,
      problem,
      user,
    };

    // If solved, update streak
    if (input.status === 'solved') {
      this.recalculateStreak(userId);
    }

    this.state.attempts.unshift(newAttempt);
    this.persistState();
    this.emit('attempts');
    this.emit('daily_goals');
    return newAttempt;
  }

  public updateAttempt(attemptId: string, updates: Partial<LogAttemptInput>): Attempt | null {
    let updated: Attempt | null = null;
    this.state.attempts = this.state.attempts.map((a) => {
      if (a.id === attemptId) {
        updated = {
          ...a,
          ...updates,
          updated_at: new Date().toISOString(),
        };
        return updated;
      }
      return a;
    });

    if (updated) {
      this.persistState();
      this.emit('attempts');
      this.emit('daily_goals');
    }
    return updated;
  }

  public deleteAttempt(attemptId: string): void {
    this.state.attempts = this.state.attempts.filter((a) => a.id !== attemptId);
    this.persistState();
    this.emit('attempts');
    this.emit('daily_goals');
  }

  // --- Streak Computation ---
  public getStreak(userId: string = this.state.currentUserId): Streak {
    const todayStr = getTodayString();
    const userSolvesToday = this.state.attempts.some(
      (a) => a.user_id === userId && a.status === 'solved' && a.solved_at.startsWith(todayStr)
    );

    let streak = this.state.streaks.find((s) => s.user_id === userId);
    if (!streak) {
      streak = {
        user_id: userId,
        current_streak: 0,
        longest_streak: 0,
        last_active_date: null,
        freezes_available: 2,
        freezes_used: 0,
        last_freeze_date: null,
        is_at_risk: false,
        updated_at: new Date().toISOString(),
      };
      this.state.streaks.push(streak);
      this.persistState();
    } else {
      const isAtRisk = !userSolvesToday && streak.current_streak > 0;
      if (streak.is_at_risk !== isAtRisk || streak.freezes_available === undefined) {
        streak = {
          ...streak,
          freezes_available: streak.freezes_available ?? 2,
          freezes_used: streak.freezes_used ?? 0,
          last_freeze_date: streak.last_freeze_date ?? null,
          is_at_risk: isAtRisk,
        };
        const idx = this.state.streaks.findIndex((s) => s.user_id === userId);
        if (idx >= 0) this.state.streaks[idx] = streak;
        this.persistState();
      }
    }
    return streak;
  }

  public recalculateStreak(userId: string): Streak {
    const todayStr = getTodayString();
    const userSolves = this.state.attempts
      .filter((a) => a.user_id === userId && a.status === 'solved')
      .map((a) => a.solved_at.split('T')[0]);

    const uniqueDates = Array.from(new Set(userSolves)).sort().reverse();

    let current = 0;
    let longest = 0;

    if (uniqueDates.length > 0) {
      // Calculate current streak
      const todayDate = new Date(todayStr);
      let checkDate = new Date(todayDate);

      // If user hasn't solved today yet, check if solved yesterday
      const yesterdayStr = getOffsetDateString(-1);
      const solvedToday = uniqueDates.includes(todayStr);
      const solvedYesterday = uniqueDates.includes(yesterdayStr);

      if (solvedToday || solvedYesterday) {
        if (!solvedToday) {
          checkDate.setDate(checkDate.getDate() - 1);
        }

        while (true) {
          const dateStr = checkDate.toISOString().split('T')[0];
          if (uniqueDates.includes(dateStr)) {
            current += 1;
            checkDate.setDate(checkDate.getDate() - 1);
          } else {
            break;
          }
        }
      }

      // Calculate longest streak historically
      let tempStreak = 0;
      const sortedAsc = [...uniqueDates].sort();
      for (let i = 0; i < sortedAsc.length; i++) {
        if (i === 0) {
          tempStreak = 1;
        } else {
          const prev = new Date(sortedAsc[i - 1]);
          const curr = new Date(sortedAsc[i]);
          const diffDays = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays === 1) {
            tempStreak += 1;
          } else {
            tempStreak = 1;
          }
        }
        if (tempStreak > longest) longest = tempStreak;
      }
      longest = Math.max(longest, current);
    }

    const existing = this.state.streaks.find((s) => s.user_id === userId);
    let freezesAvailable = existing?.freezes_available ?? 2;
    let freezesUsed = existing?.freezes_used ?? 0;
    let lastFreezeDate = existing?.last_freeze_date ?? null;

    // Check if missed yesterday and freeze should auto-apply
    const solvedToday = uniqueDates.includes(todayStr);
    const solvedYesterday = uniqueDates.includes(getOffsetDateString(-1));

    if (!solvedYesterday && !solvedToday && existing && existing.current_streak > 0) {
      if (freezesAvailable > 0 && lastFreezeDate !== getOffsetDateString(-1)) {
        freezesAvailable -= 1;
        freezesUsed += 1;
        lastFreezeDate = getOffsetDateString(-1);
        current = existing.current_streak;
      }
    }

    const isAtRisk = !solvedToday && current > 0;

    const updatedStreak: Streak = {
      user_id: userId,
      current_streak: current,
      longest_streak: Math.max(longest, existing?.longest_streak ?? 0, current),
      last_active_date: uniqueDates[0] || null,
      freezes_available: freezesAvailable,
      freezes_used: freezesUsed,
      last_freeze_date: lastFreezeDate,
      is_at_risk: isAtRisk,
      updated_at: new Date().toISOString(),
    };

    const idx = this.state.streaks.findIndex((s) => s.user_id === userId);
    if (idx >= 0) {
      this.state.streaks[idx] = updatedStreak;
    } else {
      this.state.streaks.push(updatedStreak);
    }

    this.persistState();
    this.emit('streaks');
    return updatedStreak;
  }

  // --- Comments Management ---
  public getComments(attemptId?: string): ProblemComment[] {
    const userMap = new Map(this.state.profiles.map((p) => [p.id, p]));
    const filtered = attemptId
      ? this.state.comments.filter((c) => c.attempt_id === attemptId)
      : this.state.comments;

    return filtered.map((c) => ({
      ...c,
      author: c.author || userMap.get(c.author_id),
    }));
  }

  public addComment(attemptId: string, authorId: string, body: string): ProblemComment {
    const author = this.state.profiles.find((p) => p.id === authorId);
    const newComment: ProblemComment = {
      id: `comm-${Date.now()}`,
      attempt_id: attemptId,
      author_id: authorId,
      body: body.trim(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      author,
    };

    this.state.comments.push(newComment);
    this.persistState();
    this.emit('comments');
    return newComment;
  }

  public deleteComment(commentId: string): void {
    this.state.comments = this.state.comments.filter((c) => c.id !== commentId);
    this.persistState();
    this.emit('comments');
  }

  // --- Pokes & Nudges Store ---
  public getPokes(userId: string = this.state.currentUserId): FriendPoke[] {
    const userMap = new Map(this.state.profiles.map((p) => [p.id, p]));
    return (this.state.pokes || [])
      .filter((p) => p.sender_id === userId || p.receiver_id === userId)
      .map((p) => ({
        ...p,
        sender: p.sender || userMap.get(p.sender_id),
        receiver: p.receiver || userMap.get(p.receiver_id),
      }))
      .sort((a, b) => new Date(b.poked_at).getTime() - new Date(a.poked_at).getTime());
  }

  public canPokeToday(senderId: string, receiverId: string): boolean {
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const lastPoke = (this.state.pokes || []).find(
      (p) =>
        p.sender_id === senderId &&
        p.receiver_id === receiverId &&
        new Date(p.poked_at).getTime() > oneDayAgo
    );
    return !lastPoke;
  }

  public pokeFriend(
    senderId: string,
    receiverId: string,
    message: string = 'Sent you a practice reminder!'
  ): { success: boolean; poke?: FriendPoke; error?: string } {
    if (!this.canPokeToday(senderId, receiverId)) {
      return {
        success: false,
        error: 'You can only nudge a peer once every 24 hours.',
      };
    }

    const sender = this.state.profiles.find((p) => p.id === senderId);
    const receiver = this.state.profiles.find((p) => p.id === receiverId);

    const newPoke: FriendPoke = {
      id: `poke-${Date.now()}`,
      sender_id: senderId,
      receiver_id: receiverId,
      poked_at: new Date().toISOString(),
      message: message.trim(),
      sender,
      receiver,
    };

    if (!this.state.pokes) this.state.pokes = [];
    this.state.pokes.unshift(newPoke);
    this.persistState();
    this.emit('pokes');
    return { success: true, poke: newPoke };
  }

  // --- Duels Store ---
  public getDuels(userId: string = this.state.currentUserId): Duel[] {
    const probMap = new Map(SEED_PROBLEMS.map((p) => [p.id, p]));
    const userMap = new Map(this.state.profiles.map((p) => [p.id, p]));

    return (this.state.duels || [])
      .filter((d) => d.challenger_id === userId || d.opponent_id === userId)
      .map((d) => ({
        ...d,
        problem: d.problem || probMap.get(d.problem_id),
        challenger: d.challenger || userMap.get(d.challenger_id),
        opponent: d.opponent || userMap.get(d.opponent_id),
      }))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  public createDuel(challengerId: string, opponentId: string, problemId: string): Duel {
    const probMap = new Map(SEED_PROBLEMS.map((p) => [p.id, p]));
    const userMap = new Map(this.state.profiles.map((p) => [p.id, p]));

    const newDuel: Duel = {
      id: `duel-${Date.now()}`,
      challenger_id: challengerId,
      opponent_id: opponentId,
      problem_id: problemId,
      status: 'pending',
      challenger_time_sec: null,
      opponent_time_sec: null,
      winner_id: null,
      start_time: null,
      end_time: null,
      created_at: new Date().toISOString(),
      problem: probMap.get(problemId),
      challenger: userMap.get(challengerId),
      opponent: userMap.get(opponentId),
    };

    if (!this.state.duels) this.state.duels = [];
    this.state.duels.unshift(newDuel);
    this.persistState();
    this.emit('duels');
    return newDuel;
  }

  public acceptDuel(duelId: string): Duel | null {
    let updated: Duel | null = null;
    this.state.duels = (this.state.duels || []).map((d) => {
      if (d.id === duelId && d.status === 'pending') {
        updated = {
          ...d,
          status: 'active',
          start_time: new Date().toISOString(),
        };
        return updated;
      }
      return d;
    });

    if (updated) {
      this.persistState();
      this.emit('duels');
    }
    return updated;
  }

  public declineDuel(duelId: string): Duel | null {
    let updated: Duel | null = null;
    this.state.duels = (this.state.duels || []).map((d) => {
      if (d.id === duelId && d.status === 'pending') {
        updated = {
          ...d,
          status: 'declined',
        };
        return updated;
      }
      return d;
    });

    if (updated) {
      this.persistState();
      this.emit('duels');
    }
    return updated;
  }

  public completeDuel(duelId: string, userId: string, solveTimeSec: number): Duel | null {
    let updated: Duel | null = null;
    this.state.duels = (this.state.duels || []).map((d) => {
      if (d.id === duelId) {
        const isChallenger = d.challenger_id === userId;
        const isOpponent = d.opponent_id === userId;
        if (!isChallenger && !isOpponent) return d;

        const challengerTime = isChallenger ? solveTimeSec : d.challenger_time_sec;
        const opponentTime = isOpponent ? solveTimeSec : d.opponent_time_sec;

        let winnerId: string | null = null;
        let status: DuelStatus = d.status;
        let endTime = d.end_time;

        if (
          challengerTime !== null &&
          challengerTime !== undefined &&
          opponentTime !== null &&
          opponentTime !== undefined
        ) {
          status = 'completed';
          endTime = new Date().toISOString();
          if (challengerTime < opponentTime) {
            winnerId = d.challenger_id;
          } else if (opponentTime < challengerTime) {
            winnerId = d.opponent_id;
          } else {
            winnerId = null;
          }
        } else {
          status = 'completed';
          winnerId = userId;
          endTime = new Date().toISOString();
        }

        updated = {
          ...d,
          challenger_time_sec: challengerTime,
          opponent_time_sec: opponentTime,
          winner_id: winnerId,
          status,
          end_time: endTime,
        };
        return updated;
      }
      return d;
    });

    if (updated) {
      this.persistState();
      this.emit('duels');
    }
    return updated;
  }

  // --- Milestone Badges Evaluation ---
  public evaluateBadges(userId: string = this.state.currentUserId): {
    unlockedBadges: Badge[];
    lockedBadges: Badge[];
    completionRate: number;
  } {
    const probMap = new Map(SEED_PROBLEMS.map((p) => [p.id, p]));
    const userSolves = this.state.attempts.filter(
      (a) => a.user_id === userId && a.status === 'solved'
    );

    const streak = this.getStreak(userId);
    const maxStreak = Math.max(streak.current_streak, streak.longest_streak);
    const totalSolves = userSolves.length;

    let easyCount = 0;
    let mediumCount = 0;
    let hardCount = 0;
    let dpCount = 0;
    let treeCount = 0;
    let graphCount = 0;

    const dpSolvesByDate = new Map<string, number>();
    for (const att of userSolves) {
      const prob = att.problem || probMap.get(att.problem_id);
      if (!prob) continue;

      if (prob.difficulty === 'Easy') easyCount++;
      if (prob.difficulty === 'Medium') mediumCount++;
      if (prob.difficulty === 'Hard') hardCount++;

      const tags = prob.tags.map((t) => t.toLowerCase());
      if (tags.some((t) => t.includes('dynamic programming'))) {
        dpCount++;
        const d = att.solved_at.split('T')[0];
        dpSolvesByDate.set(d, (dpSolvesByDate.get(d) || 0) + 1);
      }
      if (tags.some((t) => t.includes('tree') || t.includes('bst'))) treeCount++;
      if (
        tags.some(
          (t) =>
            t.includes('graph') ||
            t.includes('breadth-first search') ||
            t.includes('depth-first search')
        )
      ) {
        graphCount++;
      }
    }

    const maxDpIn24h = Math.max(0, ...Array.from(dpSolvesByDate.values()));

    // Clean sheet calculation: 5 consecutive clean solves
    let maxCleanRun = 0;
    let currentCleanRun = 0;
    const sortedSolves = [...userSolves].sort(
      (a, b) => new Date(a.solved_at).getTime() - new Date(b.solved_at).getTime()
    );
    for (const att of sortedSolves) {
      const isClean =
        !att.needs_revisit &&
        att.status === 'solved' &&
        (!att.confidence_rating || att.confidence_rating >= 3);
      if (isClean) {
        currentCleanRun++;
        if (currentCleanRun > maxCleanRun) maxCleanRun = currentCleanRun;
      } else {
        currentCleanRun = 0;
      }
    }

    // Night shift calculation: solve between 00:00 and 05:00
    const nightShiftSolves = userSolves.filter((att) => {
      const h = new Date(att.solved_at).getHours();
      return h >= 0 && h < 5;
    }).length;

    const unlockedBadges: Badge[] = [];
    const lockedBadges: Badge[] = [];

    for (const b of ALL_BADGES) {
      let unlocked = false;
      let progress = 0;

      switch (b.id) {
        case 'first_solve':
          unlocked = totalSolves >= 1;
          progress = Math.min(100, Math.round((totalSolves / 1) * 100));
          break;
        case 'streak_7':
          unlocked = maxStreak >= 7;
          progress = Math.min(100, Math.round((maxStreak / 7) * 100));
          break;
        case 'streak_30':
          unlocked = maxStreak >= 30;
          progress = Math.min(100, Math.round((maxStreak / 30) * 100));
          break;
        case 'easy_master':
          unlocked = easyCount >= 15;
          progress = Math.min(100, Math.round((easyCount / 15) * 100));
          break;
        case 'medium_master':
          unlocked = mediumCount >= 15;
          progress = Math.min(100, Math.round((mediumCount / 15) * 100));
          break;
        case 'hard_master':
          unlocked = hardCount >= 3;
          progress = Math.min(100, Math.round((hardCount / 3) * 100));
          break;
        case 'dp_specialist':
          unlocked = dpCount >= 5;
          progress = Math.min(100, Math.round((dpCount / 5) * 100));
          break;
        case 'tree_climber':
          unlocked = treeCount >= 8;
          progress = Math.min(100, Math.round((treeCount / 8) * 100));
          break;
        case 'graph_explorer':
          unlocked = graphCount >= 5;
          progress = Math.min(100, Math.round((graphCount / 5) * 100));
          break;
        case 'half_century_50':
          unlocked = totalSolves >= 50;
          progress = Math.min(100, Math.round((totalSolves / 50) * 100));
          break;
        case 'dp_blitz':
          unlocked = maxDpIn24h >= 3;
          progress = Math.min(100, Math.round((maxDpIn24h / 3) * 100));
          break;
        case 'the_phoenix':
          unlocked =
            (streak.longest_streak > streak.current_streak && streak.current_streak >= 3) ||
            (streak.freezes_used > 0 && streak.current_streak >= 3) ||
            streak.current_streak >= 3;
          progress = Math.min(100, Math.round((streak.current_streak / 3) * 100));
          break;
        case 'clean_sheet':
          unlocked = maxCleanRun >= 5;
          progress = Math.min(100, Math.round((maxCleanRun / 5) * 100));
          break;
        case 'night_shift':
          unlocked = nightShiftSolves >= 1;
          progress = Math.min(100, Math.round((nightShiftSolves / 1) * 100));
          break;
      }

      if (unlocked) {
        unlockedBadges.push({
          ...b,
          unlocked_at: userSolves[0]?.solved_at || new Date().toISOString(),
          progress: 100,
        });
      } else {
        lockedBadges.push({
          ...b,
          unlocked_at: null,
          progress,
        });
      }
    }

    const completionRate = Math.round((unlockedBadges.length / ALL_BADGES.length) * 100);

    return {
      unlockedBadges,
      lockedBadges,
      completionRate,
    };
  }

  // --- Weekly Recap Computation ---
  public getWeeklyRecap(userId: string = this.state.currentUserId): WeeklyRecap {
    const probMap = new Map(SEED_PROBLEMS.map((p) => [p.id, p]));
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const weekStartStr = new Date(sevenDaysAgo).toISOString().split('T')[0];
    const weekEndStr = new Date().toISOString().split('T')[0];

    const userAttempts = this.state.attempts.filter(
      (a) => a.user_id === userId && new Date(a.solved_at).getTime() >= sevenDaysAgo
    );

    const solvedAttempts = userAttempts.filter((a) => a.status === 'solved');

    let easySolves = 0;
    let mediumSolves = 0;
    let hardSolves = 0;
    const tagCounts = new Map<string, number>();

    for (const att of solvedAttempts) {
      const prob = att.problem || probMap.get(att.problem_id);
      if (!prob) continue;

      if (prob.difficulty === 'Easy') easySolves++;
      else if (prob.difficulty === 'Medium') mediumSolves++;
      else if (prob.difficulty === 'Hard') hardSolves++;

      for (const tag of prob.tags) {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      }
    }

    let strongestTag: string | null = null;
    let maxCount = 0;
    for (const [tag, count] of tagCounts.entries()) {
      if (count > maxCount) {
        maxCount = count;
        strongestTag = tag;
      }
    }

    const needsReviewAttempts = userAttempts.filter(
      (a) =>
        a.needs_revisit ||
        a.status === 'needs_review' ||
        (a.confidence_rating !== undefined && a.confidence_rating <= 2)
    );
    let weakestTag: string | null = null;
    if (needsReviewAttempts.length > 0) {
      const reviewProb =
        needsReviewAttempts[0].problem || probMap.get(needsReviewAttempts[0].problem_id);
      weakestTag = reviewProb?.tags[0] || 'Dynamic Programming';
    } else {
      const coreTags = ['Dynamic Programming', 'Graph', 'Tree', 'Binary Search', 'Sliding Window'];
      weakestTag = coreTags.find((t) => !tagCounts.has(t)) || 'Dynamic Programming';
    }

    const streak = this.getStreak(userId);
    const pointsEarned = easySolves * 1 + mediumSolves * 3 + hardSolves * 5;

    const acceptedFriendIds = this.state.friendships
      .filter(
        (f) => f.status === 'accepted' && (f.requester_id === userId || f.addressee_id === userId)
      )
      .map((f) => (f.requester_id === userId ? f.addressee_id : f.requester_id));

    let totalFriendSolves = 0;
    let topFriendSolves = 0;
    let topFriendName: string | null = null;

    for (const friendId of acceptedFriendIds) {
      const friendSolves = this.state.attempts.filter(
        (a) =>
          a.user_id === friendId &&
          a.status === 'solved' &&
          new Date(a.solved_at).getTime() >= sevenDaysAgo
      ).length;
      totalFriendSolves += friendSolves;
      if (friendSolves > topFriendSolves) {
        topFriendSolves = friendSolves;
        const friendProfile = this.state.profiles.find((p) => p.id === friendId);
        topFriendName = friendProfile?.full_name || friendProfile?.username || null;
      }
    }

    const friendAverageSolves =
      acceptedFriendIds.length > 0
        ? Math.round((totalFriendSolves / acceptedFriendIds.length) * 10) / 10
        : 0;

    const userSolvesCount = solvedAttempts.length;
    let userPercentile = 50;
    if (userSolvesCount > friendAverageSolves) {
      userPercentile = 80;
    } else if (userSolvesCount === friendAverageSolves) {
      userPercentile = 50;
    } else {
      userPercentile = 35;
    }

    return {
      week_start: weekStartStr,
      week_end: weekEndStr,
      total_solves: userSolvesCount,
      easy_solves: easySolves,
      medium_solves: mediumSolves,
      hard_solves: hardSolves,
      points_earned: pointsEarned,
      current_streak: streak.current_streak,
      strongest_tag: strongestTag,
      weakest_tag: weakestTag,
      friend_comparison: {
        user_solves: userSolvesCount,
        friend_average_solves: friendAverageSolves,
        top_friend_name: topFriendName,
        user_percentile: userPercentile,
      },
    };
  }

  // --- Reset Store ---
  public reset(): void {
    this.state = buildDefaultDemoState();
    this.persistState();
    this.emit('*');
  }
}

// Global Singleton Demo Store
export const demoStore = new DemoStore();

// ============================================================================
// Demo Mode Utilities & Helpers
// ============================================================================

export function isDemoModeActive(): boolean {
  if (typeof window === 'undefined') return false;
  const stored = localStorage.getItem(DEMO_ACTIVE_KEY);
  return stored === 'true';
}

export function setDemoModeActive(active: boolean): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(DEMO_ACTIVE_KEY, active ? 'true' : 'false');
    window.dispatchEvent(new CustomEvent('recurse_demo_mode_changed', { detail: active }));
  }
}
