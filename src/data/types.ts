/**
 * CodeGrind Canonical Type Registry
 * All types and interfaces across backend, state management, and API hooks.
 */

// ============================================================================
// Core Primitive Unions & Enums
// ============================================================================

export type ProblemDifficulty = 'Easy' | 'Medium' | 'Hard';

export type AttemptStatus = 'solved' | 'attempted' | 'needs_review';

export type FriendshipStatus = 'pending' | 'accepted' | 'rejected';

export type GoalPresetType = 'Light' | 'Standard' | 'Grinder' | 'Custom';

export type GoalCadence = 'daily' | 'weekly' | 'both';

export interface IdentityLabel {
  readonly title: string;
  readonly description: string;
  readonly category: 'consistency' | 'specialist' | 'resilience' | 'pace';
}

export type LeaderboardTimeframe = 'today' | 'week' | 'all_time';

// ============================================================================
// User & Profile
// ============================================================================

export interface Profile {
  readonly id: string;
  readonly username: string;
  readonly full_name: string;
  readonly avatar_url: string;
  readonly bio: string;
  readonly leetcode_username: string | null;
  readonly identity_label?: IdentityLabel;
  readonly is_online: boolean;
  readonly last_seen_at: string;
  readonly created_at: string;
  readonly updated_at: string;
}

export interface AuthUser {
  readonly id: string;
  readonly email: string;
  readonly profile: Profile;
}

// ============================================================================
// Friendship & Peer Accountability
// ============================================================================

export interface Friendship {
  readonly id: string;
  readonly requester_id: string;
  readonly addressee_id: string;
  readonly status: FriendshipStatus;
  readonly created_at: string;
  readonly updated_at: string;
  readonly friend_profile?: Profile;
}

export interface FriendWithStatus {
  readonly friendship_id: string;
  readonly status: FriendshipStatus;
  readonly profile: Profile;
  readonly is_online: boolean;
  readonly last_seen_at: string;
  readonly solved_today_count: number;
  readonly current_streak: number;
  readonly weekly_points: number;
}

// ============================================================================
// Daily Goals
// ============================================================================

export interface DailyGoal {
  readonly id: string;
  readonly user_id: string;
  readonly preset: GoalPresetType;
  readonly cadence: GoalCadence;
  readonly easy_target: number;
  readonly medium_target: number;
  readonly hard_target: number;
  readonly weekly_target: number; // e.g. 10 problems/week
  readonly effective_from: string; // YYYY-MM-DD
  readonly created_at: string;
  readonly updated_at: string;
}

export interface DailyGoalProgress {
  readonly easy_solved: number;
  readonly medium_solved: number;
  readonly hard_solved: number;
  readonly easy_target: number;
  readonly medium_target: number;
  readonly hard_target: number;
  readonly total_solved: number;
  readonly total_target: number;
  readonly remaining_count: number; // Near-miss countdown: max(0, total_target - total_solved)
  readonly percentage: number; // 0 to 100
  readonly is_complete: boolean;
}

export interface WeeklyGoalProgress {
  readonly total_solved: number;
  readonly target_count: number;
  readonly endowed_count: number; // e.g. 1 bonus credit from active streak momentum
  readonly effective_solved: number; // total_solved + endowed_count
  readonly remaining_count: number; // max(0, target_count - effective_solved)
  readonly days_remaining: number; // Days until Sunday midnight
  readonly percentage: number;
  readonly is_complete: boolean;
}

export interface DualGoalProgress {
  readonly cadence: GoalCadence;
  readonly daily: DailyGoalProgress;
  readonly weekly: WeeklyGoalProgress;
  readonly is_daily_active: boolean;
  readonly is_weekly_active: boolean;
}

export interface GoalPresetConfig {
  readonly preset: GoalPresetType;
  readonly name: string;
  readonly easy_target: number;
  readonly medium_target: number;
  readonly hard_target: number;
  readonly description: string;
}

// ============================================================================
// Problems Catalog
// ============================================================================

export interface Problem {
  readonly id: string;
  readonly frontend_id: number;
  readonly leetcode_slug: string;
  readonly title: string;
  readonly difficulty: ProblemDifficulty;
  readonly tags: readonly string[];
  readonly company_tags: readonly string[];
  readonly url: string;
  readonly acceptance_rate: number;
  readonly cached_at: string;
}

// ============================================================================
// Attempts & Approaches
// ============================================================================

export interface Attempt {
  readonly id: string;
  readonly user_id: string;
  readonly problem_id: string;
  readonly status: AttemptStatus;
  readonly approach_notes: string;
  readonly pattern_tag: string | null;
  readonly time_complexity: string | null;
  readonly space_complexity: string | null;
  readonly time_spent_min: number | null;
  readonly submission_url: string | null;
  readonly solved_at: string; // ISO 8601
  readonly needs_revisit: boolean;
  readonly revisit_by: string | null;
  readonly confidence_rating?: 1 | 2 | 3 | 4 | 5;
  readonly created_at: string;
  readonly updated_at: string;
  readonly problem?: Problem;
  readonly user?: Profile;
}

export interface LogAttemptInput {
  readonly problem_id: string;
  readonly status: AttemptStatus;
  readonly approach_notes?: string;
  readonly pattern_tag?: string;
  readonly time_complexity?: string;
  readonly space_complexity?: string;
  readonly time_spent_min?: number;
  readonly submission_url?: string;
  readonly needs_revisit?: boolean;
  readonly confidence_rating?: 1 | 2 | 3 | 4 | 5;
}

// ============================================================================
// Streaks & Activity Heatmap
// ============================================================================

export interface Streak {
  readonly user_id: string;
  readonly current_streak: number;
  readonly longest_streak: number;
  readonly last_active_date: string | null; // YYYY-MM-DD
  readonly freezes_available: number; // e.g. 2
  readonly freezes_used: number;
  readonly last_freeze_date?: string | null;
  readonly is_at_risk: boolean; // true if 0 solves logged today
  readonly updated_at: string;
}

export interface HeatmapCell {
  readonly date: string; // YYYY-MM-DD
  readonly count: number;
  readonly level: 0 | 1 | 2 | 3 | 4; // 0=none, 1=light, 2=medium, 3=high, 4=grind
  readonly problems: readonly {
    readonly id: string;
    readonly title: string;
    readonly difficulty: ProblemDifficulty;
  }[];
}

export interface HeatmapData {
  readonly total_solves_in_year: number;
  readonly active_days: number;
  readonly current_streak: number;
  readonly longest_streak: number;
  readonly weeks: readonly {
    readonly week_index: number;
    readonly days: readonly HeatmapCell[];
  }[];
}

// ============================================================================
// Leaderboard
// ============================================================================

export interface LeaderboardUser {
  readonly rank: number;
  readonly user_id: string;
  readonly username: string;
  readonly full_name: string;
  readonly avatar_url: string;
  readonly leetcode_username: string | null;
  readonly points: number; // Easy=1, Medium=3, Hard=5
  readonly solved_count: number;
  readonly easy_count: number;
  readonly medium_count: number;
  readonly hard_count: number;
  readonly current_streak: number;
  readonly is_current_user: boolean;
}

// ============================================================================
// Problem / Attempt Peer Comments
// ============================================================================

export interface ProblemComment {
  readonly id: string;
  readonly attempt_id: string;
  readonly author_id: string;
  readonly body: string;
  readonly created_at: string;
  readonly updated_at: string;
  readonly author?: Profile;
}

// ============================================================================
// Filter and Query States
// ============================================================================

export interface ProblemFilterState {
  readonly search: string;
  readonly difficulty: ProblemDifficulty | 'All';
  readonly tag: string | 'All';
  readonly status: AttemptStatus | 'unsolved' | 'All';
}

// ============================================================================
// Curated Problem Lists
// ============================================================================

export type CuratedListId = 'blind75' | 'neetcode150' | 'grind75' | 'top150';

export interface CuratedList {
  readonly id: CuratedListId;
  readonly name: string;
  readonly description: string;
  readonly problem_slugs: readonly string[];
}

export interface CuratedListProgress {
  readonly list_id: CuratedListId;
  readonly total: number;
  readonly solved: number;
  readonly percentage: number;
  readonly easy_solved: number;
  readonly medium_solved: number;
  readonly hard_solved: number;
}

// ============================================================================
// 1v1 Problem Duels
// ============================================================================

export type DuelStatus = 'pending' | 'active' | 'completed' | 'declined';

export interface Duel {
  readonly id: string;
  readonly challenger_id: string;
  readonly opponent_id: string;
  readonly problem_id: string;
  readonly status: DuelStatus;
  readonly challenger_time_sec?: number | null;
  readonly opponent_time_sec?: number | null;
  readonly winner_id?: string | null;
  readonly start_time?: string | null;
  readonly end_time?: string | null;
  readonly created_at: string;
  readonly problem?: Problem;
  readonly challenger?: Profile;
  readonly opponent?: Profile;
}

// ============================================================================
// Friend Pokes & Nudges
// ============================================================================

export interface FriendPoke {
  readonly id: string;
  readonly sender_id: string;
  readonly receiver_id: string;
  readonly poked_at: string;
  readonly message: string;
  readonly sender?: Profile;
  readonly receiver?: Profile;
}

// ============================================================================
// Milestone Badges & Achievements
// ============================================================================

export type BadgeId =
  | 'first_solve'
  | 'streak_7'
  | 'streak_30'
  | 'easy_master'
  | 'medium_master'
  | 'hard_master'
  | 'dp_specialist'
  | 'tree_climber'
  | 'graph_explorer'
  | 'half_century_50'
  // Variable / Surprise Badges
  | 'dp_blitz'
  | 'the_phoenix'
  | 'clean_sheet'
  | 'night_shift';

export interface Badge {
  readonly id: BadgeId;
  readonly name: string;
  readonly description: string;
  readonly icon_name: string;
  readonly category: 'streak' | 'volume' | 'mastery' | 'topic' | 'surprise';
  readonly unlocked_at?: string | null;
  readonly progress?: number;
}

// ============================================================================
// Weekly Performance Recap
// ============================================================================

export interface WeeklyRecap {
  readonly week_start: string;
  readonly week_end: string;
  readonly total_solves: number;
  readonly easy_solves: number;
  readonly medium_solves: number;
  readonly hard_solves: number;
  readonly points_earned: number;
  readonly current_streak: number;
  readonly strongest_tag: string | null;
  readonly weakest_tag: string | null;
  readonly friend_comparison: {
    readonly user_solves: number;
    readonly friend_average_solves: number;
    readonly top_friend_name: string | null;
    readonly user_percentile: number;
  };
}

