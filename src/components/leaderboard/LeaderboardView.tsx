'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Trophy, Medal, Flame, Calendar, Crown } from 'lucide-react';
import styles from './LeaderboardView.module.css';
import GlassCard from '../ui/GlassCard';
import { LeaderboardUser, LeaderboardTimeframe } from '../../data/types';

export interface LeaderboardViewProps {
  leaderboard: readonly LeaderboardUser[];
  timeframe: LeaderboardTimeframe;
  onTimeframeChange: (tf: LeaderboardTimeframe) => void;
}

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({
  leaderboard,
  timeframe,
  onTimeframeChange,
}) => {
  const top1 = leaderboard[0];
  const top2 = leaderboard[1];
  const top3 = leaderboard[2];

  return (
    <div className={styles.container}>
      {/* Header and Timeframe Filter */}
      <GlassCard variant="default" className={styles.headerCard}>
        <div className={styles.titleArea}>
          <div className={styles.heading}>
            <Trophy size={20} className="text-accent-orange" />
            <span>Peer Accountability Leaderboard</span>
          </div>
          <p className={styles.subheading}>
            Points: Easy = 1 pt • Medium = 3 pts • Hard = 5 pts
          </p>
        </div>

        <div className={styles.timeframeSelector} role="tablist">
          {(
            [
              { id: 'today', label: 'Today' },
              { id: 'week', label: 'This Week' },
              { id: 'all_time', label: 'All Time' },
            ] as const
          ).map((item) => {
            const isActive = timeframe === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`${styles.timeframeBtn} ${
                  isActive ? styles.timeframeBtnActive : ''
                }`}
                onClick={() => onTimeframeChange(item.id)}
              >
                {isActive && (
                  <motion.div
                    layoutId="leaderboardTimeframeIndicator"
                    className={styles.timeframeActiveBg}
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  />
                )}
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </GlassCard>

      {/* Podium for Top 3 Friends */}
      {leaderboard.length >= 3 && (
        <div className={styles.podiumSection}>
          {/* 2nd Place */}
          {top2 && (
            <GlassCard variant="subtle" className={styles.podiumCard}>
              <div className={`${styles.medalBadge} ${styles.silverMedal}`}>
                <Medal size={12} />
                <span>#2 Silver</span>
              </div>
              <img
                src={top2.avatar_url}
                alt={top2.full_name}
                className={styles.podiumAvatar}
              />
              <div className={styles.podiumName}>{top2.full_name}</div>
              <div className={styles.podiumHandle}>@{top2.username}</div>
              <div className={styles.podiumPoints}>{top2.points}</div>
              <span className={styles.podiumPointsLabel}>Points</span>
            </GlassCard>
          )}

          {/* 1st Place (Center & Elevated) */}
          {top1 && (
            <GlassCard
              variant="elevated"
              glow="orange"
              className={`${styles.podiumCard} ${styles.firstPlaceCard}`}
            >
              <div className={`${styles.medalBadge} ${styles.goldMedal}`}>
                <Crown size={12} />
                <span>#1 Champion</span>
              </div>
              <img
                src={top1.avatar_url}
                alt={top1.full_name}
                className={styles.podiumAvatar}
                style={{ width: '4.25rem', height: '4.25rem' }}
              />
              <div className={styles.podiumName}>{top1.full_name}</div>
              <div className={styles.podiumHandle}>@{top1.username}</div>
              <div className={styles.podiumPoints}>{top1.points}</div>
              <span className={styles.podiumPointsLabel}>Points</span>
            </GlassCard>
          )}

          {/* 3rd Place */}
          {top3 && (
            <GlassCard variant="subtle" className={styles.podiumCard}>
              <div className={`${styles.medalBadge} ${styles.bronzeMedal}`}>
                <Medal size={12} />
                <span>#3 Bronze</span>
              </div>
              <img
                src={top3.avatar_url}
                alt={top3.full_name}
                className={styles.podiumAvatar}
              />
              <div className={styles.podiumName}>{top3.full_name}</div>
              <div className={styles.podiumHandle}>@{top3.username}</div>
              <div className={styles.podiumPoints}>{top3.points}</div>
              <span className={styles.podiumPointsLabel}>Points</span>
            </GlassCard>
          )}
        </div>
      )}

      {/* Complete Rankings Table */}
      <GlassCard variant="default" className={styles.tableCard}>
        <div className={styles.tableWrapper}>
          <table className={styles.leaderboardTable}>
            <thead className={styles.tableHeader}>
              <tr>
                <th className={styles.th} style={{ textAlign: 'center', width: '3.5rem' }}>
                  Rank
                </th>
                <th className={styles.th}>Grinder</th>
                <th className={styles.th}>Solve Breakdown</th>
                <th className={styles.th}>Streak</th>
                <th className={styles.th} style={{ textAlign: 'right' }}>
                  Score
                </th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((user) => (
                <tr
                  key={user.user_id}
                  className={`${styles.tr} ${
                    user.is_current_user ? styles.currentUserRow : ''
                  }`}
                >
                  <td className={`${styles.td} ${styles.rankCol}`}>
                    {user.rank === 1 ? (
                      <span className="inline-flex items-center gap-1 font-semibold text-accent-orange">
                        <Crown size={14} className="shrink-0" />
                        <span>1</span>
                      </span>
                    ) : user.rank === 2 ? (
                      <span className="inline-flex items-center gap-1 font-medium text-label-primary">
                        <Medal size={14} className="shrink-0 text-label-secondary" />
                        <span>2</span>
                      </span>
                    ) : user.rank === 3 ? (
                      <span className="inline-flex items-center gap-1 font-medium text-label-secondary">
                        <Medal size={14} className="shrink-0 text-accent-orange/70" />
                        <span>3</span>
                      </span>
                    ) : (
                      <span className="text-label-tertiary font-mono text-[13px]">#{user.rank}</span>
                    )}
                  </td>
                  <td className={styles.td}>
                    <div className={styles.userCol}>
                      <img
                        src={user.avatar_url}
                        alt={user.full_name}
                        className={styles.tableAvatar}
                      />
                      <div className={styles.userNameBlock}>
                        <div className={styles.tableName}>
                          <span>{user.full_name}</span>
                          {user.is_current_user && (
                            <span className={styles.youBadge}>YOU</span>
                          )}
                        </div>
                        <span className={styles.tableHandle}>@{user.username}</span>
                      </div>
                    </div>
                  </td>
                  <td className={styles.td}>
                    <div className={styles.breakdownPills}>
                      <span className={styles.easyTag}>{user.easy_count}E</span>
                      <span>·</span>
                      <span className={styles.medTag}>{user.medium_count}M</span>
                      <span>·</span>
                      <span className={styles.hardTag}>{user.hard_count}H</span>
                      <span className="text-label-tertiary">({user.solved_count} total)</span>
                    </div>
                  </td>
                  <td className={styles.td}>
                    <span className="inline-flex items-center gap-1 font-semibold text-accent-orange">
                      <Flame size={14} />
                      {user.current_streak}d
                    </span>
                  </td>
                  <td className={styles.td} style={{ textAlign: 'right' }}>
                    <span className={styles.pointsCell}>{user.points}</span>
                    <span className="text-xs text-label-secondary ml-1">pts</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
};

export default LeaderboardView;
