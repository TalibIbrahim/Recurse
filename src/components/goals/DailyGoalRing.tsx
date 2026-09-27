'use client';

import React, { useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { motion } from 'framer-motion';
import {
  Settings2,
  CheckCircle2,
  Target,
  Sparkles,
  AlertTriangle,
  Calendar,
  Users,
  Award,
} from 'lucide-react';
import styles from './DailyGoalRing.module.css';
import GlassCard from '../ui/GlassCard';
import {
  DailyGoalProgress,
  GoalPresetType,
  GoalCadence,
  WeeklyGoalProgress,
  DualGoalProgress,
} from '../../data/types';
import { AmbientFriendInfo } from '../../hooks/useDailyGoal';

export interface DailyGoalRingProps {
  progress: DailyGoalProgress;
  weeklyProgress?: WeeklyGoalProgress;
  dualProgress?: DualGoalProgress;
  ambientFriend?: AmbientFriendInfo | null;
  preset: GoalPresetType;
  cadence?: GoalCadence;
  isAtRisk?: boolean;
  onOpenSettings: () => void;
}

export const DailyGoalRing: React.FC<DailyGoalRingProps> = ({
  progress,
  weeklyProgress,
  ambientFriend,
  preset,
  cadence = 'both',
  isAtRisk = false,
  onOpenSettings,
}) => {
  const prevCompletedRef = useRef(false);

  const isDailyActive = cadence === 'daily' || cadence === 'both';
  const isWeeklyActive = cadence === 'weekly' || cadence === 'both';

  // Trigger confetti when goals are completed
  useEffect(() => {
    if (progress.is_complete && !prevCompletedRef.current && progress.total_target > 0) {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#30D158', '#0A84FF', '#FF9F0A', '#FF453A', '#BF5AF2'],
      });
    }
    prevCompletedRef.current = progress.is_complete;
  }, [progress.is_complete, progress.total_target]);

  // Concentric circle geometry
  const size = 200;
  const center = size / 2;
  const strokeWidth = 11;

  // Ring configurations
  const rings = [
    {
      id: 'easy',
      name: 'Easy',
      radius: 80,
      solved: progress.easy_solved,
      target: progress.easy_target,
      color: '#30D158',
      bgColor: 'rgba(48, 209, 88, 0.18)',
    },
    {
      id: 'medium',
      name: 'Medium',
      radius: 63,
      solved: progress.medium_solved,
      target: progress.medium_target,
      color: '#FF9F0A',
      bgColor: 'rgba(255, 159, 10, 0.18)',
    },
    {
      id: 'hard',
      name: 'Hard',
      radius: 46,
      solved: progress.hard_solved,
      target: progress.hard_target,
      color: '#FF453A',
      bgColor: 'rgba(255, 69, 58, 0.18)',
    },
  ];

  return (
    <GlassCard variant="elevated" className={styles.container}>
      {/* Header */}
      <div className={styles.topRow}>
        <div className={styles.titleArea}>
          <div className={styles.heading}>
            <Target size={20} className="text-accent-blue" />
            <span>Practice Rings</span>
            <span className={styles.presetBadge}>
              {cadence === 'both' ? `${preset} + Weekly` : `${preset} (${cadence})`}
            </span>
            {isAtRisk && (
              <div className={styles.atRiskBadge} title="Solve 1 problem before midnight to save streak">
                <AlertTriangle size={13} />
                <span>At Risk</span>
              </div>
            )}
          </div>
          <p className={styles.subheading}>
            {isDailyActive && isWeeklyActive
              ? 'Maintain daily habit momentum while reaching your weekly stretch target'
              : isWeeklyActive
              ? 'Pace your problems freely across the week to reach your target'
              : 'Close all 3 rings to protect your streak and level up'}
          </p>
        </div>

        <button
          type="button"
          className={styles.customizeBtn}
          onClick={onOpenSettings}
          aria-label="Customize practice goal targets"
        >
          <Settings2 size={15} />
          <span>Customize</span>
        </button>
      </div>

      {/* Main Content Area */}
      <div className={styles.mainContent}>
        {/* SVG Concentric Rings */}
        <div className={styles.ringsWrapper}>
          <svg width={size} height={size} className={styles.svgRings}>
            {rings.map((ring) => {
              const circumference = 2 * Math.PI * ring.radius;
              const ratio = ring.target > 0 ? Math.min(ring.solved / ring.target, 1) : 0;
              const strokeDashoffset = circumference - ratio * circumference;

              return (
                <g key={ring.id}>
                  {/* Track Background */}
                  <circle
                    cx={center}
                    cy={center}
                    r={ring.radius}
                    fill="none"
                    stroke={ring.bgColor}
                    strokeWidth={strokeWidth}
                  />

                  {/* Active Progress Ring */}
                  {ring.target > 0 && (
                    <motion.circle
                      cx={center}
                      cy={center}
                      r={ring.radius}
                      fill="none"
                      stroke={ring.color}
                      strokeWidth={strokeWidth}
                      strokeDasharray={circumference}
                      initial={{ strokeDashoffset: circumference }}
                      animate={{ strokeDashoffset }}
                      transition={{ type: 'spring', stiffness: 120, damping: 20 }}
                      strokeLinecap="round"
                    />
                  )}
                </g>
              );
            })}
          </svg>

          {/* Center Info Overlay */}
          <div className={styles.ringCenterInfo}>
            <span className={styles.centerPercentage}>{progress.percentage}%</span>
            <span className={styles.centerLabel}>Daily</span>
            {progress.is_complete && (
              <motion.div
                className={styles.completionBadge}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 15 }}
              >
                <Sparkles size={11} />
                <span>RINGS CLOSED</span>
              </motion.div>
            )}
          </div>
        </div>

        {/* Breakdown Stats & Near-Miss Framing */}
        <div className={styles.statsList}>
          {rings.map((ring) => {
            const isMet = ring.target > 0 && ring.solved >= ring.target;
            return (
              <div key={ring.id} className={styles.statRow}>
                <div className={styles.statLeft}>
                  <div
                    className={styles.statDot}
                    style={{ backgroundColor: ring.color, color: ring.color }}
                  />
                  <span className={styles.statName}>{ring.name}</span>
                </div>

                <div className={styles.statCount}>
                  <span className={styles.currentSolved}>{ring.solved}</span>
                  <span className={styles.targetCount}>/ {ring.target} target</span>
                  {isMet && <CheckCircle2 size={16} className={styles.checkIcon} />}
                </div>
              </div>
            );
          })}

          {/* Near-Miss Countdown Display */}
          <div className={styles.nearMissBar}>
            <span>
              {progress.remaining_count > 0 ? (
                <>
                  <span className={styles.nearMissHighlight}>{progress.remaining_count} more</span> to
                  close daily rings
                </>
              ) : (
                <span className={styles.nearMissHighlight}>All daily targets completed today</span>
              )}
            </span>
            <span className="text-xs text-label-tertiary">
              {progress.total_solved}/{progress.total_target} solved
            </span>
          </div>
        </div>
      </div>

      {/* Weekly Stretch Cadence Section */}
      {isWeeklyActive && weeklyProgress && (
        <div className={styles.weeklyCard}>
          <div className={styles.weeklyHeader}>
            <div className={styles.weeklyTitle}>
              <Calendar size={15} className="text-accent-blue" />
              <span>Weekly Stretch Goal: {weeklyProgress.target_count} Problems</span>
              {weeklyProgress.endowed_count > 0 && (
                <span className={styles.endowedBadge} title="Momentum credit from streak >= 3">
                  +1 Streak Momentum
                </span>
              )}
            </div>
            <div className="text-xs font-semibold text-label-secondary">
              {weeklyProgress.effective_solved} of {weeklyProgress.target_count} done this week
            </div>
          </div>

          <div className={styles.weeklyTrack}>
            <div
              className={styles.weeklyFill}
              style={{ width: `${Math.min(100, weeklyProgress.percentage)}%` }}
            />
          </div>

          <div className={styles.weeklyFooter}>
            <span>
              {weeklyProgress.remaining_count > 0 ? (
                <>
                  <strong className="text-label-primary">{weeklyProgress.remaining_count}</strong> more
                  to go this week
                </>
              ) : (
                <strong className="text-accent-green">Weekly stretch goal met</strong>
              )}
            </span>
            <span>
              {weeklyProgress.days_remaining}{' '}
              {weeklyProgress.days_remaining === 1 ? 'day' : 'days'} remaining
            </span>
          </div>
        </div>
      )}

      {/* Ambient Peer Companion Ring (Gentle Social Comparison) */}
      {ambientFriend && (
        <div className={styles.ambientCompanion}>
          <div className={styles.ambientLeft}>
            <img
              src={
                ambientFriend.friend.avatar_url ||
                'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150'
              }
              alt={ambientFriend.friend.full_name}
              className={styles.ambientAvatar}
            />
            <div className={styles.ambientMeta}>
              <span className={styles.ambientName}>{ambientFriend.friend.full_name}</span>
              <span className={styles.ambientStatus}>
                {ambientFriend.solved_today} solves today · {ambientFriend.current_streak}d streak
              </span>
            </div>
          </div>

          <div className={styles.ambientRight}>
            <Award size={14} className="text-accent-blue" />
            <span>
              {ambientFriend.is_complete
                ? 'Rings Closed'
                : `${ambientFriend.solved_today}/${ambientFriend.daily_target} today`}
            </span>
          </div>
        </div>
      )}
    </GlassCard>
  );
};

export default DailyGoalRing;
