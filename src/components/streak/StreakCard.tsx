'use client';

import React from 'react';
import { Flame, Trophy, CalendarCheck, Zap, Shield, AlertTriangle } from 'lucide-react';
import styles from './StreakCard.module.css';
import GlassCard from '../ui/GlassCard';
import { Streak } from '../../data/types';

export interface StreakCardProps {
  streak: Streak | null;
}

export const StreakCard: React.FC<StreakCardProps> = ({ streak }) => {
  const currentStreak = streak?.current_streak ?? 0;
  const longestStreak = streak?.longest_streak ?? 0;
  const lastActive = streak?.last_active_date || 'Today';
  const freezesAvailable = streak?.freezes_available ?? 2;
  const freezesUsed = streak?.freezes_used ?? 0;
  const isAtRisk = streak?.is_at_risk ?? false;

  return (
    <GlassCard variant="elevated" glow="orange" className={styles.cardContainer}>
      <div className={styles.topRow}>
        <div className={styles.titleGroup}>
          <Flame size={16} className="text-accent-orange" />
          <span className={styles.cardTitle}>Daily Consistency Streak</span>
        </div>
        <div className={styles.statusPill}>
          <Zap size={11} />
          <span>ACTIVE</span>
        </div>
      </div>

      <div className={styles.mainHero}>
        <div className={styles.flameIconWrapper}>
          <Flame size={28} className="text-accent-orange" />
        </div>
        <div>
          <span className={styles.streakNumber}>{currentStreak}</span>
          <span className={styles.streakUnit}> {currentStreak === 1 ? 'day' : 'days'}</span>
        </div>
      </div>

      {/* At-Risk Warning (Loss Aversion) */}
      {isAtRisk && (
        <div className={styles.atRiskWarning}>
          <AlertTriangle size={15} className="flex-shrink-0 mt-0.5" />
          <div>
            <strong>Streak at risk!</strong> Solve 1 problem before midnight.
            {freezesAvailable > 0
              ? ` (${freezesAvailable} freeze ${freezesAvailable === 1 ? 'shield' : 'shields'} will auto-protect if missed)`
              : ' (No freezes remaining — streak will reset if missed!)'}
          </div>
        </div>
      )}

      {/* Streak Freeze Shields */}
      <div className={styles.freezeRow}>
        <div className={styles.freezeLeft}>
          <Shield size={13} className="text-accent-blue" />
          <span>Streak Freezes: {freezesAvailable} Available</span>
        </div>
        <div className={styles.freezeShields}>
          {Array.from({ length: 2 }).map((_, i) => {
            const isAvailable = i < freezesAvailable;
            return (
              <Shield
                key={i}
                size={14}
                className={isAvailable ? styles.shieldActive : styles.shieldUsed}
              />
            );
          })}
        </div>
      </div>

      <div className={styles.metaGrid}>
        <div className={styles.metaItem}>
          <span className={styles.metaLabel}>Personal Best</span>
          <span className={styles.metaValue}>{longestStreak} days</span>
        </div>
        <div className={styles.metaItem}>
          <span className={styles.metaLabel}>Last Activity</span>
          <span className={styles.metaValue}>{lastActive}</span>
        </div>
      </div>
    </GlassCard>
  );
};

export default StreakCard;
