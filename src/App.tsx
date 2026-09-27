'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Flame,
  Target,
  Trophy,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import styles from './App.module.css';

// Layout & UI
import Navbar, { NavTabId } from './components/layout/Navbar';
import GlassCard from './components/ui/GlassCard';
import Toast from './components/ui/Toast';
import LandingPage from './components/landing/LandingPage';

// Modals
import AuthModal from './components/auth/AuthModal';
import OnboardingModal, { OnboardingData } from './components/onboarding/OnboardingModal';
import GoalSettingModal from './components/goals/GoalSettingModal';
import LogAttemptModal from './components/problems/LogAttemptModal';
import ProblemCommentsModal from './components/comments/ProblemCommentsModal';
import WeeklyRecapModal from './components/recap/WeeklyRecapModal';
import DuelModal from './components/duels/DuelModal';
import StatCardModal from './components/stats/StatCardModal';
import ExtensionGuideModal from './components/extension/ExtensionGuideModal';

// Features & Components
import DailyGoalRing from './components/goals/DailyGoalRing';
import ProblemList from './components/problems/ProblemList';
import StreakCard from './components/streak/StreakCard';
import HeatmapView from './components/streak/HeatmapView';
import FriendsView from './components/friends/FriendsView';
import FriendActivityFeed from './components/friends/FriendActivityFeed';
import LeaderboardView from './components/leaderboard/LeaderboardView';
import NeedsRevisitSection from './components/revisit/NeedsRevisitSection';
import DuelBanner from './components/duels/DuelBanner';
import BadgesGrid from './components/badges/BadgesGrid';

// Alfred's Hooks & Data
import {
  useAuth,
  useDailyGoal,
  useAttempts,
  useFriends,
  useStreak,
  useLeaderboard,
  useNeedsRevisit,
  useComments,
  useDuels,
  useWeeklyRecap,
  useBadges,
} from './hooks';
import { SEED_PROBLEMS } from './data/problemsSeed';
import { Problem, Attempt } from './data/types';

export function App() {
  const [activeTab, setActiveTab] = useState<NavTabId>('today');

  // Hooks
  const {
    user,
    profile,
    isDemo,
    loading: authLoading,
    signInWithEmail,
    signUpWithEmail,
    signInAsDemoUser,
    enterDemoMode,
    exitDemoMode,
    signOut,
    updateProfile,
  } = useAuth();

  const currentUserId = user?.id;

  const {
    preset,
    cadence,
    progress,
    weeklyProgress,
    dualProgress,
    ambientFriend,
    setPreset,
    updateCustomGoal,
  } = useDailyGoal(currentUserId);

  const {
    attempts,
    friendAttempts,
    logAttempt,
    updateAttempt,
    deleteAttempt,
    getAttemptForProblem,
  } = useAttempts(currentUserId);

  const {
    friends,
    pendingRequests,
    searchUsers,
    sendFriendRequest,
    respondToRequest,
    removeFriend,
  } = useFriends(currentUserId);

  const { streak, heatmapData } = useStreak(currentUserId);

  const {
    leaderboard,
    timeframe,
    setTimeframe,
  } = useLeaderboard(currentUserId);

  const {
    revisitProblems,
    markReviewed,
  } = useNeedsRevisit(currentUserId);

  // Duels hook
  const {
    activeDuels,
    pendingDuels,
    sendChallenge,
    acceptDuel,
    declineDuel,
    submitSolve,
  } = useDuels(currentUserId);

  // Weekly Recap hook
  const { recap } = useWeeklyRecap(currentUserId);

  // Badges hook
  const { allBadges } = useBadges(currentUserId);

  // Highest unlocked badge
  const topBadge = useMemo(() => {
    const unlocked = allBadges.filter((b) => Boolean(b.unlocked_at));
    return unlocked[unlocked.length - 1] || allBadges[0];
  }, [allBadges]);

  // Modals state
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup'>('signin');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [recapModalOpen, setRecapModalOpen] = useState(false);
  const [duelModalOpen, setDuelModalOpen] = useState(false);
  const [statCardModalOpen, setStatCardModalOpen] = useState(false);
  const [extensionModalOpen, setExtensionModalOpen] = useState(false);

  // Toast feedback state
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'info' | 'error';
    visible: boolean;
  }>({
    message: '',
    type: 'success',
    visible: false,
  });

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type, visible: true });
  };

  // Check if newly signed in non-demo user needs onboarding
  useEffect(() => {
    if (user && !isDemo) {
      const hasCompleted = localStorage.getItem('recurse_onboarding_completed');
      if (!hasCompleted && !profile?.identity_label) {
        setShowOnboarding(true);
      }
    }
  }, [user, isDemo, profile?.identity_label]);

  const [logModalState, setLogModalState] = useState<{
    isOpen: boolean;
    problem: Problem | null;
    attempt?: Attempt;
  }>({
    isOpen: false,
    problem: null,
  });

  const [discussionModalState, setDiscussionModalState] = useState<{
    isOpen: boolean;
    problemTitle: string;
    attemptId?: string;
  }>({
    isOpen: false,
    problemTitle: '',
  });

  // Comments hook for active discussion
  const {
    comments,
    addComment,
    deleteComment,
  } = useComments(discussionModalState.attemptId, currentUserId);

  // Modal Handlers
  const handleOpenLogModal = (problem: Problem, attempt?: Attempt) => {
    const existing = attempt || getAttemptForProblem(problem.id);
    setLogModalState({
      isOpen: true,
      problem,
      attempt: existing,
    });
  };

  const handleOpenDiscussionFromProblem = (problem: Problem, attempt?: Attempt) => {
    const existing = attempt || getAttemptForProblem(problem.id);
    setDiscussionModalState({
      isOpen: true,
      problemTitle: problem.title,
      attemptId: existing?.id,
    });
  };

  const handleOpenDiscussionFromFeed = (attempt: Attempt) => {
    setDiscussionModalState({
      isOpen: true,
      problemTitle: attempt.problem?.title || 'Problem Discussion',
      attemptId: attempt.id,
    });
  };

  const handleAuthSuccess = (type: 'signin' | 'signup', username?: string) => {
    setAuthModalOpen(false);
    if (type === 'signup') {
      showToast(`Account created! Welcome to Recurse, ${username || 'friend'}.`, 'success');
      setShowOnboarding(true);
    } else {
      showToast(`Signed in successfully. Welcome back!`, 'success');
    }
  };

  const handleCompleteOnboarding = async (data: OnboardingData) => {
    try {
      await updateProfile({
        full_name: data.fullName,
        leetcode_username: data.leetcodeUsername,
        identity_label: {
          title: data.persona,
          description: `Dedicated ${data.persona.toLowerCase()} practicing on Recurse`,
          category: 'consistency',
        },
      });

      await updateCustomGoal(
        progress.easy_target,
        progress.medium_target,
        progress.hard_target,
        data.weeklyTarget,
        data.cadence
      );

      localStorage.setItem('recurse_onboarding_completed', 'true');
      setShowOnboarding(false);
      showToast('Profile and practice cadence configured! Happy problem solving.', 'success');
    } catch (err: unknown) {
      console.error('Onboarding completion error:', err);
      setShowOnboarding(false);
    }
  };

  // Top Stats Summary
  const currentStreak = streak?.current_streak ?? 0;
  const userRank = leaderboard.find((u) => u.is_current_user)?.rank ?? 1;

  // If user is neither logged in nor in demo mode, show Landing Page
  if (!authLoading && !user && !isDemo) {
    return (
      <>
        <LandingPage
          onOpenAuth={(mode) => {
            setAuthModalMode(mode);
            setAuthModalOpen(true);
          }}
          onExploreDemo={() => {
            enterDemoMode();
            showToast('Entered Demo Sandbox Mode', 'info');
          }}
        />

        <AuthModal
          isOpen={authModalOpen}
          initialMode={authModalMode}
          onClose={() => setAuthModalOpen(false)}
          onSignInWithEmail={signInWithEmail}
          onSignUpWithEmail={signUpWithEmail}
          onSignInAsDemo={() => {
            enterDemoMode();
            setAuthModalOpen(false);
            showToast('Entered Demo Sandbox Mode', 'info');
          }}
          onSuccess={handleAuthSuccess}
        />

        <Toast
          message={toast.message}
          type={toast.type}
          visible={toast.visible}
          onClose={() => setToast((prev) => ({ ...prev, visible: false }))}
        />
      </>
    );
  }

  return (
    <div className={styles.appRoot}>
      {/* Subtle Ambient Apple Blur Orbs */}
      <div className={styles.ambientOrbBlue} aria-hidden="true" />
      <div className={styles.ambientOrbPurple} aria-hidden="true" />

      {/* Demo Sandbox Top Banner */}
      {isDemo && (
        <div className={styles.demoNoticeBar}>
          <div className={styles.demoNoticeText}>
            <Sparkles size={14} className="text-[#0A84FF]" />
            <span>
              <strong>Demo Sandbox Mode</strong> — Viewing simulated peer pod data. Changes persist locally.
            </span>
          </div>
          <div className={styles.demoNoticeActions}>
            <button
              type="button"
              className={styles.demoNoticeExitBtn}
              onClick={() => {
                exitDemoMode();
                showToast('Exited demo mode', 'info');
              }}
            >
              Exit Demo
            </button>
            <button
              type="button"
              className={styles.demoNoticeRegisterBtn}
              onClick={() => {
                setAuthModalMode('signup');
                setAuthModalOpen(true);
              }}
            >
              Create Account
            </button>
          </div>
        </div>
      )}

      {/* Navigation Header */}
      <Navbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        streakCount={currentStreak}
        currentProfile={profile}
        isDemo={isDemo}
        onOpenAuthModal={() => {
          setAuthModalMode('signin');
          setAuthModalOpen(true);
        }}
        onSignOut={async () => {
          await signOut();
          showToast('Signed out successfully', 'info');
        }}
        onOpenRecap={() => setRecapModalOpen(true)}
        onOpenDuel={() => setDuelModalOpen(true)}
        onOpenShareCard={() => setStatCardModalOpen(true)}
        onOpenExtensionGuide={() => setExtensionModalOpen(true)}
        activeDuelsCount={activeDuels.length + pendingDuels.length}
      />

      {/* Main Container */}
      <main className={styles.mainContent}>
        {/* Active & Pending Duels Live Banner */}
        <DuelBanner
          activeDuels={activeDuels}
          pendingDuels={pendingDuels}
          currentUserId={currentUserId}
          onAcceptDuel={acceptDuel}
          onDeclineDuel={declineDuel}
          onSubmitSolve={submitSolve}
          onOpenProblem={(p) => handleOpenLogModal(p)}
        />

        {/* Top Summary Banner */}
        <section className={styles.statsBanner} aria-label="Key Performance Indicators">
          <GlassCard variant="subtle" className={styles.bannerCard}>
            <div className={`${styles.bannerIconBox} ${styles.iconStreak}`}>
              <Flame size={20} />
            </div>
            <div className={styles.bannerInfo}>
              <span className={styles.bannerLabel}>Consistency Streak</span>
              <span className={styles.bannerValue}>{currentStreak} Days</span>
              <span className={styles.bannerSubtext}>Personal Best: {streak?.longest_streak ?? currentStreak}d</span>
            </div>
          </GlassCard>

          <GlassCard variant="subtle" className={styles.bannerCard}>
            <div className={`${styles.bannerIconBox} ${styles.iconTarget}`}>
              <Target size={20} />
            </div>
            <div className={styles.bannerInfo}>
              <span className={styles.bannerLabel}>Today's Target</span>
              <span className={styles.bannerValue}>
                {progress.total_solved}/{progress.total_target} Solved
              </span>
              <span className={styles.bannerSubtext}>{progress.percentage}% completed</span>
            </div>
          </GlassCard>

          <GlassCard variant="subtle" className={styles.bannerCard}>
            <div className={`${styles.bannerIconBox} ${styles.iconRank}`}>
              <Trophy size={20} />
            </div>
            <div className={styles.bannerInfo}>
              <span className={styles.bannerLabel}>Peer Group Rank</span>
              <span className={styles.bannerValue}>Rank #{userRank}</span>
              <span className={styles.bannerSubtext}>Among {leaderboard.length} friends</span>
            </div>
          </GlassCard>

          <GlassCard variant="subtle" className={styles.bannerCard}>
            <div className={`${styles.bannerIconBox} ${styles.iconRevisit}`}>
              <RotateCcw size={20} />
            </div>
            <div className={styles.bannerInfo}>
              <span className={styles.bannerLabel}>Spaced Repetition</span>
              <span className={styles.bannerValue}>
                {revisitProblems.length} Due
              </span>
              <span className={styles.bannerSubtext}>Solidify retention</span>
            </div>
          </GlassCard>
        </section>

        {/* Tab Content Rendering */}
        <AnimatePresence mode="wait">
          {activeTab === 'today' && (
            <motion.div
              key="tab-today"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className={styles.todayGrid}
            >
              {/* Left Column: Rings & Revisit Queue */}
              <div className={styles.colLeft}>
                <DailyGoalRing
                  progress={progress}
                  weeklyProgress={weeklyProgress}
                  dualProgress={dualProgress}
                  ambientFriend={ambientFriend}
                  preset={preset}
                  cadence={cadence}
                  isAtRisk={streak?.is_at_risk}
                  onOpenSettings={() => setGoalModalOpen(true)}
                />

                <NeedsRevisitSection
                  revisitProblems={revisitProblems}
                  onMarkReviewed={markReviewed}
                  onSolveAgain={(prob, att) => handleOpenLogModal(prob, att)}
                />

                <StreakCard streak={streak} />
              </div>

              {/* Right Column: Peer Activity & Live Feeds */}
              <div className={styles.colRight}>
                <FriendActivityFeed
                  friendAttempts={friendAttempts}
                  onOpenDiscussion={handleOpenDiscussionFromFeed}
                />
              </div>
            </motion.div>
          )}

          {activeTab === 'problems' && (
            <motion.div
              key="tab-problems"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
            >
              <ProblemList
                problems={SEED_PROBLEMS}
                attempts={attempts}
                onOpenLogModal={handleOpenLogModal}
                onOpenDiscussion={handleOpenDiscussionFromProblem}
                currentUserId={currentUserId}
              />
            </motion.div>
          )}

          {activeTab === 'friends' && (
            <motion.div
              key="tab-friends"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className="flex flex-col gap-6"
            >
              <FriendsView
                friends={friends}
                pendingRequests={pendingRequests}
                onSearchUsers={searchUsers}
                onSendFriendRequest={sendFriendRequest}
                onRespondRequest={respondToRequest}
                onRemoveFriend={removeFriend}
                onChallengeFriend={() => setDuelModalOpen(true)}
                currentUserId={currentUserId}
              />

              <FriendActivityFeed
                friendAttempts={friendAttempts}
                onOpenDiscussion={handleOpenDiscussionFromFeed}
              />
            </motion.div>
          )}

          {activeTab === 'leaderboard' && (
            <motion.div
              key="tab-leaderboard"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
            >
              <LeaderboardView
                leaderboard={leaderboard}
                timeframe={timeframe}
                onTimeframeChange={setTimeframe}
              />
            </motion.div>
          )}

          {activeTab === 'activity' && (
            <motion.div
              key="tab-activity"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className="flex flex-col gap-6"
            >
              <StreakCard streak={streak} />
              <BadgesGrid currentUserId={currentUserId} />
              <HeatmapView heatmapData={heatmapData} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Global Modals */}
      <AuthModal
        isOpen={authModalOpen}
        initialMode={authModalMode}
        onClose={() => setAuthModalOpen(false)}
        onSignInWithEmail={signInWithEmail}
        onSignUpWithEmail={signUpWithEmail}
        onSignInAsDemo={() => {
          enterDemoMode();
          setAuthModalOpen(false);
          showToast('Entered Demo Sandbox Mode', 'info');
        }}
        onSuccess={handleAuthSuccess}
      />

      {/* First-time Onboarding Modal */}
      <OnboardingModal
        isOpen={showOnboarding}
        userProfile={profile}
        onComplete={handleCompleteOnboarding}
      />

      <GoalSettingModal
        isOpen={goalModalOpen}
        onClose={() => setGoalModalOpen(false)}
        currentPreset={preset}
        currentEasyTarget={progress.easy_target}
        currentMediumTarget={progress.medium_target}
        currentHardTarget={progress.hard_target}
        currentCadence={cadence}
        currentWeeklyTarget={weeklyProgress.target_count}
        onSavePreset={setPreset}
        onSaveCustomGoal={updateCustomGoal}
      />

      <LogAttemptModal
        isOpen={logModalState.isOpen}
        onClose={() => setLogModalState({ isOpen: false, problem: null })}
        problem={logModalState.problem}
        existingAttempt={logModalState.attempt}
        onSaveAttempt={logAttempt}
        onUpdateAttempt={updateAttempt}
        onDeleteAttempt={deleteAttempt}
      />

      <ProblemCommentsModal
        isOpen={discussionModalState.isOpen}
        onClose={() => setDiscussionModalState({ isOpen: false, problemTitle: '' })}
        problemTitle={discussionModalState.problemTitle}
        comments={comments}
        currentUserId={currentUserId}
        onAddComment={addComment}
        onDeleteComment={deleteComment}
      />

      <WeeklyRecapModal
        isOpen={recapModalOpen}
        onClose={() => setRecapModalOpen(false)}
        recap={recap}
      />

      <DuelModal
        isOpen={duelModalOpen}
        onClose={() => setDuelModalOpen(false)}
        friends={friends}
        problems={SEED_PROBLEMS}
        onSendChallenge={sendChallenge}
      />

      <StatCardModal
        isOpen={statCardModalOpen}
        onClose={() => setStatCardModalOpen(false)}
        profile={profile}
        streak={streak}
        attempts={attempts}
        topBadgeName={topBadge?.name}
      />

      <ExtensionGuideModal
        isOpen={extensionModalOpen}
        onClose={() => setExtensionModalOpen(false)}
        userId={currentUserId}
      />

      {/* Global Toast Notification */}
      <Toast
        message={toast.message}
        type={toast.type}
        visible={toast.visible}
        onClose={() => setToast((prev) => ({ ...prev, visible: false }))}
      />

      {/* Apple-style Footer */}
      <footer className={styles.appFooter}>
        <div className={styles.footerLinks}>
          <a href="#today" onClick={() => setActiveTab('today')}>Today</a>
          <span>•</span>
          <a href="#problems" onClick={() => setActiveTab('problems')}>Problems Catalog</a>
          <span>•</span>
          <a href="#friends" onClick={() => setActiveTab('friends')}>Accountability Friends</a>
          <span>•</span>
          <a href="#leaderboard" onClick={() => setActiveTab('leaderboard')}>Leaderboard</a>
          <span>•</span>
          <a href="#activity" onClick={() => setActiveTab('activity')}>Milestones &amp; Heatmap</a>
        </div>
        <p>© 2026 Recurse. Engineered with Apple Human Interface Guidelines &amp; Framer Motion.</p>
      </footer>
    </div>
  );
}

export default App;
