'use client';

import React, { useState, useMemo } from 'react';
import {
  Award,
  CheckCircle2,
  Flame,
  Zap,
  ShieldCheck,
  Target,
  Cpu,
  GitBranch,
  Network,
  Trophy,
  Lock,
  Check,
} from 'lucide-react';
import styles from './BadgesGrid.module.css';
import GlassCard from '../ui/GlassCard';
import { Badge } from '../../data/types';
import { useBadges } from '../../hooks/useBadges';

export interface BadgesGridProps {
  currentUserId?: string;
}

type BadgeCategory = 'all' | 'streak' | 'volume' | 'mastery' | 'topic';

export const BadgesGrid: React.FC<BadgesGridProps> = ({ currentUserId }) => {
  const { allBadges, completionRate } = useBadges(currentUserId);
  const [selectedCategory, setSelectedCategory] = useState<BadgeCategory>('all');

  const filteredBadges = useMemo(() => {
    if (selectedCategory === 'all') return allBadges;
    return allBadges.filter((b) => b.category === selectedCategory);
  }, [allBadges, selectedCategory]);

  const unlockedCount = useMemo(() => {
    return allBadges.filter((b) => Boolean(b.unlocked_at)).length;
  }, [allBadges]);

  const renderBadgeIcon = (iconName: string, isUnlocked: boolean) => {
    const size = 22;
    switch (iconName) {
      case 'check-circle':
        return <CheckCircle2 size={size} />;
      case 'flame':
        return <Flame size={size} />;
      case 'zap':
        return <Zap size={size} />;
      case 'shield-check':
        return <ShieldCheck size={size} />;
      case 'target':
        return <Target size={size} />;
      case 'award':
        return <Award size={size} />;
      case 'cpu':
        return <Cpu size={size} />;
      case 'git-branch':
        return <GitBranch size={size} />;
      case 'network':
        return <Network size={size} />;
      case 'trophy':
        return <Trophy size={size} />;
      default:
        return <Award size={size} />;
    }
  };

  return (
    <div className={styles.container}>
      {/* Badges Overview Card */}
      <GlassCard variant="default" className={styles.headerCard}>
        <div className={styles.headerRow}>
          <div className={styles.titleCol}>
            <div className={styles.badgeHeaderLine}>
              <Award size={14} />
              <span>Milestone Achievements</span>
            </div>
            <h2 className={styles.title}>Hall of Badges</h2>
            <span className={styles.subtitle}>
              Earn milestone tokens through consistency streaks, problem volume, and topic mastery.
            </span>
          </div>

          <div className={styles.progressCol}>
            <span className={styles.progressLabel}>
              {unlockedCount} of {allBadges.length} Unlocked ({completionRate}%)
            </span>
            <div
              className={styles.progressBarTrack}
              role="progressbar"
              aria-valuenow={completionRate}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Badges unlock progress"
            >
              <div
                className={styles.progressBarFill}
                style={{ width: `${completionRate}%` }}
              />
            </div>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className={styles.categoryBar} role="tablist" aria-label="Badge Category Filters">
          {(['all', 'streak', 'volume', 'mastery', 'topic'] as const).map((cat) => {
            const label =
              cat === 'all'
                ? 'All Badges'
                : cat === 'streak'
                ? 'Consistency'
                : cat === 'volume'
                ? 'Solve Volume'
                : cat === 'mastery'
                ? 'Difficulty Mastery'
                : 'Algorithms & Topics';

            return (
              <button
                key={cat}
                type="button"
                role="tab"
                aria-selected={selectedCategory === cat}
                className={`${styles.categoryPill} ${
                  selectedCategory === cat ? styles.categoryPillActive : ''
                }`}
                onClick={() => setSelectedCategory(cat)}
              >
                {label}
              </button>
            );
          })}
        </div>
      </GlassCard>

      {/* Badges Grid */}
      <div className={styles.badgesGrid}>
        {filteredBadges.map((badge) => {
          const isUnlocked = Boolean(badge.unlocked_at);

          return (
            <div
              key={badge.id}
              className={`${styles.badgeCard} ${
                isUnlocked ? styles.badgeCardUnlocked : styles.badgeCardLocked
              }`}
            >
              <div className={styles.cardTopRow}>
                <div
                  className={`${styles.iconContainer} ${
                    isUnlocked ? styles.iconUnlocked : ''
                  }`}
                >
                  {renderBadgeIcon(badge.icon_name, isUnlocked)}
                </div>

                <span
                  className={`${styles.badgeStatusTag} ${
                    isUnlocked ? styles.tagUnlocked : styles.tagLocked
                  }`}
                >
                  {isUnlocked ? (
                    <>
                      <Check size={12} />
                      <span>Unlocked</span>
                    </>
                  ) : (
                    <>
                      <Lock size={12} />
                      <span>Locked</span>
                    </>
                  )}
                </span>
              </div>

              <div className={styles.badgeBody}>
                <span className={styles.badgeName}>{badge.name}</span>
                <p className={styles.badgeDescription}>{badge.description}</p>
              </div>

              <div className={styles.requirementFooter}>
                {isUnlocked ? (
                  <span className={styles.unlockedAtText}>
                    Unlocked {badge.unlocked_at ? new Date(badge.unlocked_at).toLocaleDateString() : 'Active'}
                  </span>
                ) : (
                  <span className={styles.progressText}>
                    Progress: {badge.progress ?? 0}% completed
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default BadgesGrid;
