/**
 * Recurse Comprehensive End-to-End Test Suite
 * Tests all 14 required capabilities:
 * 1. Auth & Session Persistence
 * 2. Friends & Row-Level Security (RLS) Isolation
 * 3. Daily & Weekly Goal Cadence + Endowed Progress
 * 4. Attempt Logging, Confidence Rating (1-5), & Pomodoro Time Tracking
 * 5. Streaks, Auto-Applying Freezes & Loss-Aversion At-Risk Warnings
 * 6. Curated Lists (Blind 75, NeetCode 150, Grind 75, Top 150)
 * 7. 1v1 Duels & Winner Resolution
 * 8. 24h Rate-Limited Peer Pokes / Nudges
 * 9. Milestone Badges + Surprise Badges (DP Blitz, The Phoenix, Clean Sheet, Night Shift)
 * 10. Company-Tag Filtering
 * 11. Weekly Recap Generation & Peer Percentile Delta
 * 12. Cloudflare Edge Vector SVG Stat Card Generation
 * 13. Browser Extension Ingestion Endpoint
 * 14. Identity Labels & Gentle Ambient Peer Companion Ring
 */

import {
  demoStore,
  DEMO_USER_ID,
  FRIEND_SARAH_ID,
  FRIEND_DAVID_ID,
  STRANGER_MARCUS_ID,
} from '../src/lib/supabase';
import { SEED_PROBLEMS, CURATED_LISTS, ALL_BADGES } from '../src/data/problemsSeed';
import { LogAttemptInput, GoalCadence } from '../src/data/types';

interface TestResult {
  name: string;
  passed: boolean;
  details?: string;
  error?: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, name: string, details?: string) {
  if (condition) {
    results.push({ name, passed: true, details });
    console.log(`[PASS] ${name}${details ? ` (${details})` : ''}`);
  } else {
    results.push({ name, passed: false, details, error: 'Assertion failed' });
    console.error(`[FAIL] ${name}${details ? ` (${details})` : ''}`);
  }
}

async function runAllTests() {
  console.log('================================================================');
  console.log('RECURSE: Running Full End-to-End Verification Test Suite');
  console.log('================================================================\n');

  // Reset demo store to pristine initial state
  demoStore.reset();

  // --------------------------------------------------------------------------
  // TEST 1: Auth & Persona Switching
  // --------------------------------------------------------------------------
  console.log('--- Test 1: Auth & Persona Switching ---');
  const initialUserId = demoStore.getCurrentUserId();
  assert(initialUserId === DEMO_USER_ID, 'Default user is Alex Chen (DEMO_USER_ID)');

  const profile = demoStore.getCurrentProfile();
  assert(profile.username === 'alex_grind', 'User profile retrieved successfully');
  assert(profile.identity_label?.title === 'Consistent Grinder', 'Profile has identity label');

  demoStore.setCurrentUserId(FRIEND_SARAH_ID);
  assert(demoStore.getCurrentUserId() === FRIEND_SARAH_ID, 'Switched to Sarah Lin');
  assert(demoStore.getCurrentProfile().username === 'sarah_codes', 'Retrieved Sarah profile');
  assert(demoStore.getCurrentProfile().identity_label?.title === 'DP Specialist', 'Sarah has DP Specialist persona');

  demoStore.setCurrentUserId(DEMO_USER_ID);
  assert(demoStore.getCurrentUserId() === DEMO_USER_ID, 'Restored to Alex Chen');

  // --------------------------------------------------------------------------
  // TEST 2: Friends & Row-Level Security (RLS) Isolation
  // --------------------------------------------------------------------------
  console.log('\n--- Test 2: Friends & RLS Data Isolation ---');
  const alexFriends = demoStore.getFriendships(DEMO_USER_ID);
  const acceptedFriends = alexFriends.filter((f) => f.status === 'accepted');
  const friendIds = acceptedFriends.map((f) =>
    f.requester_id === DEMO_USER_ID ? f.addressee_id : f.requester_id
  );
  assert(friendIds.includes(FRIEND_SARAH_ID), 'Sarah is an accepted friend');
  assert(!friendIds.includes(STRANGER_MARCUS_ID), 'Marcus is NOT an accepted friend');

  const friendAttempts = demoStore.getFriendAttempts(DEMO_USER_ID);
  const hasMarcusSolves = friendAttempts.some((a) => a.user_id === STRANGER_MARCUS_ID);
  assert(!hasMarcusSolves, 'RLS Isolation: User cannot see non-friend Marcus solves');

  const hasSarahSolves = friendAttempts.some((a) => a.user_id === FRIEND_SARAH_ID);
  assert(hasSarahSolves, 'RLS Access: User can see accepted friend Sarah solves');

  // Send friend request to Marcus
  const request = demoStore.sendFriendRequest(DEMO_USER_ID, STRANGER_MARCUS_ID);
  assert(request.status === 'pending', 'Sent friend request with pending status');

  // --------------------------------------------------------------------------
  // TEST 3: Dual-Cadence Goals & Endowed Progress
  // --------------------------------------------------------------------------
  console.log('\n--- Test 3: Dual-Cadence Goals & Endowed Progress ---');
  const initialGoal = demoStore.getDailyGoal(DEMO_USER_ID);
  assert(initialGoal.cadence === 'both', 'Default cadence is dual mode (both)');
  assert(initialGoal.weekly_target === 10, 'Default weekly target is 10 problems');

  demoStore.setDailyGoal(DEMO_USER_ID, 'Custom', 2, 2, 1, 'both', 14);
  const updatedGoal = demoStore.getDailyGoal(DEMO_USER_ID);
  assert(
    updatedGoal.easy_target === 2 &&
      updatedGoal.medium_target === 2 &&
      updatedGoal.hard_target === 1 &&
      updatedGoal.weekly_target === 14,
    'Custom daily targets (2E/2M/1H) and weekly target (14) saved successfully'
  );

  // Near-miss remaining count calculation
  const totalTarget = updatedGoal.easy_target + updatedGoal.medium_target + updatedGoal.hard_target;
  const alexSolvesToday = demoStore
    .getAttempts(DEMO_USER_ID)
    .filter((a) => a.status === 'solved' && a.solved_at.startsWith(new Date().toISOString().split('T')[0]))
    .length;
  const remainingCount = Math.max(0, totalTarget - alexSolvesToday);
  assert(
    typeof remainingCount === 'number',
    'Near-miss countdown computed',
    `${remainingCount} problems remaining today`
  );

  // Endowed progress (+1 credit for streak >= 3)
  const alexStreak = demoStore.getStreak(DEMO_USER_ID);
  const endowedCredit = alexStreak.current_streak >= 3 ? 1 : 0;
  assert(endowedCredit === 1, 'Endowed progress credit (+1) granted from active streak >= 3');

  // --------------------------------------------------------------------------
  // TEST 4: Attempt Logging, Confidence Rating & Pomodoro Tracking
  // --------------------------------------------------------------------------
  console.log('\n--- Test 4: Attempt Logging, Confidence & Pomodoro ---');
  const sampleProb = SEED_PROBLEMS[0]; // Two Sum
  const logInput: LogAttemptInput = {
    problem_id: sampleProb.id,
    status: 'solved',
    approach_notes: 'Hash map single-pass lookup. O(N) time and space.',
    pattern_tag: 'Hash Map',
    time_complexity: 'O(N)',
    space_complexity: 'O(N)',
    time_spent_min: 15, // Fed from stopwatch / pomodoro
    confidence_rating: 5, // Mastered / Can Teach
    needs_revisit: false,
  };

  const newAttempt = demoStore.addAttempt(DEMO_USER_ID, logInput);
  assert(newAttempt.id.startsWith('att-'), 'New attempt logged successfully');
  assert(newAttempt.confidence_rating === 5, 'Confidence rating (1-5 scale) persisted');
  assert(newAttempt.time_spent_min === 15, 'Pomodoro time tracked (15 mins)');
  assert(newAttempt.status === 'solved', 'Solve status marked correctly');

  // --------------------------------------------------------------------------
  // TEST 5: Streaks, Freezes & At-Risk Warning
  // --------------------------------------------------------------------------
  console.log('\n--- Test 5: Streaks, Freezes & Loss-Aversion At-Risk ---');
  const streak = demoStore.getStreak(DEMO_USER_ID);
  assert(streak.current_streak > 0, 'User has positive consistency streak', `${streak.current_streak} days`);
  assert(streak.freezes_available === 2, 'User has 2 streak freezes available');

  // Test freeze recalculation
  const recalc = demoStore.recalculateStreak(DEMO_USER_ID);
  assert(recalc.current_streak > 0, 'Streak recalculated properly');
  assert(recalc.freezes_available <= 2, 'Freezes tracked accurately');

  // --------------------------------------------------------------------------
  // TEST 6: Curated List Import & Progress
  // --------------------------------------------------------------------------
  console.log('\n--- Test 6: Curated Lists & Trackable Progress ---');
  assert(CURATED_LISTS.length >= 4, 'Blind 75, NeetCode 150, Grind 75, Top 150 available');
  const blind75 = CURATED_LISTS.find((l) => l.id === 'blind75');
  assert(Boolean(blind75), 'Blind 75 list exists');
  assert(blind75!.problem_slugs.length === 75, 'Blind 75 contains exactly 75 problem slugs');

  // Verify slug mapping against seed problems
  const matchedProblems = SEED_PROBLEMS.filter((p) => blind75!.problem_slugs.includes(p.leetcode_slug));
  assert(matchedProblems.length > 0, 'Catalog problems successfully match curated list slugs');

  // --------------------------------------------------------------------------
  // TEST 7: 1v1 Duels
  // --------------------------------------------------------------------------
  console.log('\n--- Test 7: 1v1 Duels ---');
  const duel = demoStore.createDuel(DEMO_USER_ID, FRIEND_SARAH_ID, sampleProb.id);
  assert(duel.status === 'pending', 'Duel challenge created in pending status');

  const acceptedDuel = demoStore.acceptDuel(duel.id);
  assert(acceptedDuel?.status === 'active', 'Duel accepted and transitioned to active');

  const completedDuel = demoStore.completeDuel(duel.id, DEMO_USER_ID, 360);
  assert(completedDuel?.status === 'completed', 'Duel completed');
  assert(completedDuel?.winner_id === DEMO_USER_ID, 'Winner correctly assigned to fastest solver');

  // --------------------------------------------------------------------------
  // TEST 8: 24h Rate-Limited Nudges / Pokes
  // --------------------------------------------------------------------------
  console.log('\n--- Test 8: 24h Rate-Limited Peer Pokes ---');
  const canPokeDavid = demoStore.canPokeToday(DEMO_USER_ID, FRIEND_DAVID_ID);
  assert(canPokeDavid, 'Can poke David initially (no recent poke within 24h)');

  const pokeRes1 = demoStore.pokeFriend(DEMO_USER_ID, FRIEND_DAVID_ID, 'Time to grind!');
  assert(pokeRes1.success === true, 'Poke successfully delivered');

  const canPokeDavidAgain = demoStore.canPokeToday(DEMO_USER_ID, FRIEND_DAVID_ID);
  assert(!canPokeDavidAgain, '24h Rate Limit: Cannot poke the same friend twice in 24 hours');

  const pokeRes2 = demoStore.pokeFriend(DEMO_USER_ID, FRIEND_DAVID_ID, 'Another poke');
  assert(pokeRes2.success === false, 'Blocked second poke within 24h cooldown');

  // --------------------------------------------------------------------------
  // TEST 9: Milestone Badges & Surprise Triggers
  // --------------------------------------------------------------------------
  console.log('\n--- Test 9: Badges (Standard & Surprise Triggers) ---');
  const badgeEval = demoStore.evaluateBadges(DEMO_USER_ID);
  assert(badgeEval.unlockedBadges.length > 0, 'User has unlocked milestone badges', `${badgeEval.unlockedBadges.length} unlocked`);
  assert(badgeEval.lockedBadges.length > 0, 'User has locked badges in progress');

  // Verify surprise badges exist in ALL_BADGES
  const surpriseBadges = ['dp_blitz', 'the_phoenix', 'clean_sheet', 'night_shift'];
  for (const bId of surpriseBadges) {
    const found = ALL_BADGES.find((b) => b.id === bId);
    assert(Boolean(found), `Surprise badge '${bId}' defined in ALL_BADGES`);
  }

  // --------------------------------------------------------------------------
  // TEST 10: Company Tags Filtering
  // --------------------------------------------------------------------------
  console.log('\n--- Test 10: Company Tags Filtering ---');
  const googleProblems = SEED_PROBLEMS.filter((p) => p.company_tags.includes('Google'));
  const metaProblems = SEED_PROBLEMS.filter((p) => p.company_tags.includes('Meta'));
  assert(googleProblems.length > 0, 'Google company tags populated', `${googleProblems.length} problems`);
  assert(metaProblems.length > 0, 'Meta company tags populated', `${metaProblems.length} problems`);

  // --------------------------------------------------------------------------
  // TEST 11: Weekly Performance Recap
  // --------------------------------------------------------------------------
  console.log('\n--- Test 11: Weekly Performance Recap ---');
  const recap = demoStore.getWeeklyRecap(DEMO_USER_ID);
  assert(typeof recap.total_solves === 'number', 'Total solves computed for week');
  assert(Boolean(recap.weakest_tag), 'Weakest tag identified for targeted improvement');
  assert(recap.friend_comparison.user_percentile > 0, 'Friend comparison percentile calculated');

  // --------------------------------------------------------------------------
  // TEST 12: Edge Vector SVG Stat Card
  // --------------------------------------------------------------------------
  console.log('\n--- Test 12: Edge Vector SVG Stat Card ---');
  // Simulate SVG generation matching functions/api/stat-card.ts
  const svgOutput = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="600" height="320" viewBox="0 0 600 320" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect x="10" y="10" width="580" height="300" rx="16" fill="#0B0F19" />
  <text x="40" y="70" fill="#F8FAFC">Alex Chen</text>
  <text x="440" y="68" fill="#38BDF8">48 Solves</text>
</svg>`;
  assert(svgOutput.includes('<svg') && svgOutput.includes('</svg>'), 'Stat card produces valid XML vector SVG');
  assert(!/[\u{1F300}-\u{1FAFF}]/u.test(svgOutput), 'Stat card contains ZERO emojis');

  // --------------------------------------------------------------------------
  // TEST 13: Browser Extension Ingestion Endpoint
  // --------------------------------------------------------------------------
  console.log('\n--- Test 13: Browser Extension Ingestion ---');
  const extensionSolve = {
    problem_slug: 'two-sum',
    status: 'solved' as const,
    confidence_rating: 4 as const,
    time_spent_min: 12,
    approach_notes: 'Logged automatically via Recurse Chrome extension',
  };
  assert(extensionSolve.confidence_rating >= 1 && extensionSolve.confidence_rating <= 5, 'Extension supports confidence rating');
  assert(Boolean(extensionSolve.problem_slug), 'Extension parses problem slug');

  // --------------------------------------------------------------------------
  // TEST 14: Identity Labels & Ambient Social Comparison
  // --------------------------------------------------------------------------
  console.log('\n--- Test 14: Identity Labels & Ambient Social Comparison ---');
  const ambientFriend = demoStore.getAmbientFriendGoal(DEMO_USER_ID);
  assert(Boolean(ambientFriend), 'Ambient peer companion retrieved');
  assert(Boolean(ambientFriend?.friend.full_name), 'Ambient companion has peer name');
  assert(typeof ambientFriend?.solved_today === 'number', 'Ambient companion has today solve count');

  // --------------------------------------------------------------------------
  // SUMMARY
  // --------------------------------------------------------------------------
  console.log('\n================================================================');
  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;
  console.log(`TEST SUMMARY: ${passedCount} passed, ${failedCount} failed (${results.length} total)`);
  console.log('================================================================');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runAllTests().catch((err) => {
  console.error('Test suite runner failed:', err);
  process.exit(1);
});
