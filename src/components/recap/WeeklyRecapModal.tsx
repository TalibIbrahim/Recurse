'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Sparkles,
  Flame,
  Trophy,
  Target,
  Users,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
} from 'lucide-react';
import styles from './WeeklyRecapModal.module.css';
import { WeeklyRecap } from '../../data/types';

export interface WeeklyRecapModalProps {
  isOpen: boolean;
  onClose: () => void;
  recap: WeeklyRecap | null;
}

export const WeeklyRecapModal: React.FC<WeeklyRecapModalProps> = ({
  isOpen,
  onClose,
  recap,
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className={styles.overlay} onClick={onClose} role="dialog" aria-modal="true">
        <motion.div
          className={styles.modalCard}
          onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          transition={{ type: 'spring', stiffness: 450, damping: 30 }}
        >
          <div className={styles.sheenTop} />

          {/* Modal Header */}
          <div className={styles.header}>
            <div className={styles.headerTitleGroup}>
              <div className={styles.subheading}>
                <Sparkles size={14} />
                <span>Performance Intelligence</span>
              </div>
              <h2 className={styles.title}>Weekly Performance Recap</h2>
              <span className={styles.dateRange}>
                {recap ? `${recap.week_start} through ${recap.week_end}` : 'Current Week'}
              </span>
            </div>

            <button
              type="button"
              className={styles.closeButton}
              onClick={onClose}
              aria-label="Close weekly recap modal"
            >
              <X size={16} />
            </button>
          </div>

          {recap ? (
            <div className={styles.content}>
              {/* Key Metrics Grid */}
              <div className={styles.metricsGrid}>
                {/* Total Solves */}
                <div className={styles.metricCard}>
                  <div className={styles.metricHeader}>
                    <span className={styles.metricLabel}>Total Solves</span>
                    <Target size={16} className={styles.metricIcon} />
                  </div>
                  <span className={styles.metricValue}>{recap.total_solves}</span>
                  <div className={styles.metricBreakdown}>
                    <span className={styles.diffDotEasy} />
                    <span>{recap.easy_solves} Easy</span>
                    <span>•</span>
                    <span className={styles.diffDotMed} />
                    <span>{recap.medium_solves} Med</span>
                    <span>•</span>
                    <span className={styles.diffDotHard} />
                    <span>{recap.hard_solves} Hard</span>
                  </div>
                </div>

                {/* Points Earned */}
                <div className={styles.metricCard}>
                  <div className={styles.metricHeader}>
                    <span className={styles.metricLabel}>Points Earned</span>
                    <Trophy size={16} className="text-accent-orange" />
                  </div>
                  <span className={styles.metricValue}>{recap.points_earned}</span>
                  <div className={styles.metricBreakdown}>
                    <span>Calculated by difficulty weighting</span>
                  </div>
                </div>

                {/* Consistency Streak */}
                <div className={styles.metricCard}>
                  <div className={styles.metricHeader}>
                    <span className={styles.metricLabel}>Active Streak</span>
                    <Flame size={16} className="text-accent-orange" />
                  </div>
                  <span className={styles.metricValue}>{recap.current_streak}d</span>
                  <div className={styles.metricBreakdown}>
                    <span>Maintained daily grind</span>
                  </div>
                </div>
              </div>

              {/* Topic Insights Grid */}
              <div className={styles.topicAnalysisGrid}>
                {/* Strongest Pattern */}
                <div className={styles.topicCard}>
                  <div className={styles.topicCardHeader}>
                    <CheckCircle2 size={16} className="text-accent-green" />
                    <span className={`${styles.topicTagBadge} ${styles.topicTagStrong}`}>
                      Strongest Focus Area
                    </span>
                  </div>
                  <span className={styles.topicName}>
                    {recap.strongest_tag || 'Array & Hash Table'}
                  </span>
                  <p className={styles.topicAdvice}>
                    High accuracy and optimal time complexity noted across this week's submissions.
                  </p>
                </div>

                {/* Weakest Pattern */}
                <div className={styles.topicCard}>
                  <div className={styles.topicCardHeader}>
                    <AlertCircle size={16} className="text-accent-orange" />
                    <span className={`${styles.topicTagBadge} ${styles.topicTagWeak}`}>
                      Growth Opportunity
                    </span>
                  </div>
                  <span className={styles.topicName}>
                    {recap.weakest_tag || 'Dynamic Programming'}
                  </span>
                  <p className={styles.topicAdvice}>
                    Consider scheduling 2 targeted Medium problems in this topic to solidify retention.
                  </p>
                </div>
              </div>

              {/* Peer Comparison Delta Card */}
              {recap.friend_comparison && (
                <div className={styles.comparisonCard}>
                  <div className={styles.comparisonHeader}>
                    <div className={styles.comparisonTitleRow}>
                      <Users size={16} className="text-accent-blue" />
                      <span className={styles.comparisonTitle}>Peer Accountability Comparison</span>
                    </div>
                    <span className={styles.percentileBadge}>
                      Top {100 - recap.friend_comparison.user_percentile}%
                    </span>
                  </div>

                  <div className={styles.comparisonStatsRow}>
                    <div className={styles.compStatItem}>
                      <span className={styles.compStatLabel}>Your Solves</span>
                      <span className={styles.compStatValue}>
                        {recap.friend_comparison.user_solves} problems
                      </span>
                    </div>

                    <div className={styles.compStatItem}>
                      <span className={styles.compStatLabel}>Peer Group Avg</span>
                      <span className={styles.compStatValue}>
                        {recap.friend_comparison.friend_average_solves.toFixed(1)} problems
                      </span>
                    </div>

                    <div className={styles.compStatItem}>
                      <span className={styles.compStatLabel}>Top Grinder Peer</span>
                      <span className={styles.compStatValue}>
                        {recap.friend_comparison.top_friend_name || 'Sarah Lin'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className={styles.footer}>
                <button
                  type="button"
                  className={styles.primaryButton}
                  onClick={onClose}
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <div className={styles.content}>
              <p className={styles.topicAdvice}>
                No recap data available for this week yet. Solve more problems to unlock weekly analytics!
              </p>
              <div className={styles.footer}>
                <button
                  type="button"
                  className={styles.primaryButton}
                  onClick={onClose}
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default WeeklyRecapModal;
