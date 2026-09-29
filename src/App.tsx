'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Flame,
  Target,
  Trophy,
  RotateCcw,
  Loader2,
} from 'lucide-react';
import styles from './App.module.css';

// Layout & UI
import Navbar, { NavTabId } from './components/layout/Navbar';
import GlassCard from './components/ui/GlassCard';
import Toast from './components/ui/Toast';
import LandingPage from './components/landing/LandingPage';
import { RecurseLogo } from './components/ui/RecurseLogo';

// Modals & Auth
import AuthModal, { AuthModalMode } from './components/auth/AuthModal';
import ResetPasswordView from './components/auth/ResetPasswordView';
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
import RecentSolves from './components/solves/RecentSolves';

// Hooks & Data
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
import { findCatalogProblem } from './lib/problems';
import { problemLabel } from './lib/format';

export function App() {
  const location = useLocation();
  const navigate = useNavigate();

  // Hooks
  const {
    user,
    profile,
    loading: authLoading,
    signInWithEmail,
    signUpWithEmail,
    signInWithOAuth,
    resetPasswordForEmail,
    updatePassword,
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
    return unlocked[unlocked.length - 1];
  }, [allBadges]);

  // Catalog plus any solved problems outside it (e.g. logged by the extension)
  const catalogProblems = useMemo<readonly Problem[]>(() => {
    const extra = new Map<string, Problem>();
    attempts.forEach((a) => {
      if (a.problem && !findCatalogProblem(a.problem_id)) extra.set(a.problem_id, a.problem);
    });
    return extra.size > 0 ? [...extra.values(), ...SEED_PROBLEMS] : SEED_PROBLEMS;
  }, [attempts]);

  // Modals state
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<AuthModalMode>('signin');
  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [recapModalOpen, setRecapModalOpen] = useState(false);
  const [duelModalOpen, setDuelModalOpen] = useState(false);
  const [statCardModalOpen, setStatCardModalOpen] = useState(false);
  const [extensionModalOpen, setExtensionModalOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Problem log modal state
  const [logModalState, setLogModalState] = useState<{
    isOpen: boolean;
    problem: Problem | null;
    attempt?: Attempt;
  }>({
    isOpen: false,
    problem: null,
  });

  // Discussion modal state
  const [discussionModalState, setDiscussionModalState] = useState<{
    isOpen: boolean;
    attemptId?: string;
    problemTitle: string;
  }>({
    isOpen: false,
    problemTitle: '',
  });

  const {
    comments,
    addComment,
    deleteComment,
  } = useComments(discussionModalState.attemptId);

  // Toast notifications
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
    visible: boolean;
  }>({
    message: '',
    type: 'info',
    visible: false,
  });

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type, visible: true });
  };

  // Open log attempt modal
  const handleOpenLogModal = (problem: Problem, existingAttempt?: Attempt) => {
    const attempt = existingAttempt || getAttemptForProblem(problem.id);
    setLogModalState({
      isOpen: true,
      problem,
      attempt,
    });
  };

  // Open discussion thread
  const handleOpenDiscussionFromProblem = (problem: Problem) => {
    const attempt = getAttemptForProblem(problem.id);
    setDiscussionModalState({
      isOpen: true,
      attemptId: attempt?.id,
      problemTitle: problemLabel(problem),
    });
  };

  const handleOpenDiscussionFromFeed = (attempt: Attempt) => {
    setDiscussionModalState({
      isOpen: true,
      attemptId: attempt.id,
      problemTitle: attempt.problem ? problemLabel(attempt.problem) : 'Problem Discussion',
    });
  };

  // Success handler from Auth Modal
  const handleAuthSuccess = (type: 'signin' | 'signup', _username?: string) => {
    if (type === 'signup') {
      setShowOnboarding(true);
      showToast('Account created successfully! Welcome to Recurse.', 'success');
    } else {
      showToast('Welcome back! Practice momentum restored.', 'success');
    }
    navigate('/today');
  };

  // Complete onboarding
  const handleCompleteOnboarding = async (data: OnboardingData) => {
    try {
      if (data.fullName || data.leetcodeUsername) {
        await updateProfile({
          full_name: data.fullName || profile?.full_name,
          leetcode_username: data.leetcodeUsername || profile?.leetcode_username,
        });
      }

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

  // 1. Initial Auth Loading State
  if (authLoading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#09090B] text-label-secondary">
        <RecurseLogo size={28} showWordmark={true} />
        <div className="mt-4 flex items-center gap-2 text-xs font-medium text-label-tertiary">
          <Loader2 size={16} className="animate-spin text-[#0A84FF]" />
          <span>Initializing workspace...</span>
        </div>
      </div>
    );
  }

  // 2. Dedicated Password Reset Route (accessible logged in or out)
  if (location.pathname === '/reset-password') {
    return (
      <>
        <ResetPasswordView
          onUpdatePassword={updatePassword}
          onNotify={showToast}
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

  // 3. Logged-out view: Landing Page
  if (!user) {
    return (
      <>
        <LandingPage
          onOpenAuth={(mode) => {
            setAuthModalMode(mode);
            setAuthModalOpen(true);
          }}
        />

        <AuthModal
          isOpen={authModalOpen}
          initialMode={authModalMode}
          onClose={() => setAuthModalOpen(false)}
          onSignInWithEmail={signInWithEmail}
          onSignUpWithEmail={signUpWithEmail}
          onSignInWithOAuth={signInWithOAuth}
          onResetPasswordForEmail={resetPasswordForEmail}
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

  // 4. Logged-in view: User Dashboard with Client-side URL Routing
  return (
    <div className={styles.appRoot}>
      {/* Subtle Ambient Apple Blur Orbs */}
      <div className={styles.ambientOrbBlue} aria-hidden="true" />
      <div className={styles.ambientOrbPurple} aria-hidden="true" />

      {/* Navigation Header */}
      <Navbar
        streakCount={currentStreak}
        currentProfile={profile}
        onOpenAuthModal={() => {
          setAuthModalMode('signin');
          setAuthModalOpen(true);
        }}
        onSignOut={async () => {
          await signOut();
          showToast('Signed out successfully', 'info');
          navigate('/');
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

        {/* Routes */}
        <Routes>
          <Route path="/" element={<Navigate to="/today" replace />} />
          <Route
            path="/today"
            element={
              <motion.div
                key="route-today"
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
                </div>

                {/* Right Column: Peer Activity & Live Feeds */}
                <div className={styles.colRight}>
                  <RecentSolves
                    attempts={attempts}
                    onEditAttempt={(prob, att) => handleOpenLogModal(prob, att)}
                  />

                  <StreakCard streak={streak} />

                  <FriendActivityFeed
                    friendAttempts={friendAttempts}
                    onOpenDiscussion={handleOpenDiscussionFromFeed}
                  />
                </div>
              </motion.div>
            }
          />

          <Route
            path="/problems"
            element={
              <motion.div
                key="route-problems"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
              >
                <ProblemList
                  problems={catalogProblems}
                  attempts={attempts}
                  onOpenLogModal={handleOpenLogModal}
                  onOpenDiscussion={handleOpenDiscussionFromProblem}
                  currentUserId={currentUserId}
                />
              </motion.div>
            }
          />

          <Route
            path="/friends"
            element={
              <motion.div
                key="route-friends"
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
            }
          />

          <Route
            path="/leaderboard"
            element={
              <motion.div
                key="route-leaderboard"
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
            }
          />

          <Route
            path="/stats"
            element={
              <motion.div
                key="route-stats"
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
            }
          />

          {/* Alias /activity to /stats */}
          <Route path="/activity" element={<Navigate to="/stats" replace />} />
          <Route path="*" element={<Navigate to="/today" replace />} />
        </Routes>
      </main>

      {/* Global Modals */}
      <AuthModal
        isOpen={authModalOpen}
        initialMode={authModalMode}
        onClose={() => setAuthModalOpen(false)}
        onSignInWithEmail={signInWithEmail}
        onSignUpWithEmail={signUpWithEmail}
        onSignInWithOAuth={signInWithOAuth}
        onResetPasswordForEmail={resetPasswordForEmail}
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
        onSaveCustomGoal={updateCustomGoal}
        onSaved={() => showToast('Practice goal updated.', 'success')}
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
          <Link to="/today">Today</Link>
          <span>•</span>
          <Link to="/problems">Problems Catalog</Link>
          <span>•</span>
          <Link to="/friends">Accountability Friends</Link>
          <span>•</span>
          <Link to="/leaderboard">Leaderboard</Link>
          <span>•</span>
          <Link to="/stats">Milestones &amp; Heatmap</Link>
        </div>
        <p>© 2026 Recurse. Engineered with Apple Human Interface Guidelines &amp; Framer Motion.</p>
      </footer>
    </div>
  );
}

export default App;
