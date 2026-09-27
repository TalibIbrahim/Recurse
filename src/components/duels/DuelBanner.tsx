'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Swords,
  Clock,
  ExternalLink,
  Check,
  X,
  Trophy,
} from 'lucide-react';
import styles from './DuelBanner.module.css';
import { Duel, Problem } from '../../data/types';

export interface DuelBannerProps {
  activeDuels: readonly Duel[];
  pendingDuels: readonly Duel[];
  currentUserId?: string;
  onAcceptDuel: (duelId: string) => Promise<{ success: boolean; error?: string }>;
  onDeclineDuel: (duelId: string) => Promise<{ success: boolean; error?: string }>;
  onSubmitSolve?: (duelId: string, seconds: number) => Promise<{ success: boolean; error?: string }>;
  onOpenProblem?: (problem: Problem) => void;
}

export const DuelBanner: React.FC<DuelBannerProps> = ({
  activeDuels,
  pendingDuels,
  currentUserId,
  onAcceptDuel,
  onDeclineDuel,
  onSubmitSolve,
  onOpenProblem,
}) => {
  // Synchronized countdown timer state
  const [secondsLeftMap, setSecondsLeftMap] = useState<Record<string, number>>({});

  useEffect(() => {
    if (activeDuels.length === 0) return;

    const interval = window.setInterval(() => {
      const now = Date.now();
      const updatedMap: Record<string, number> = {};

      activeDuels.forEach((duel) => {
        const startTime = duel.start_time ? new Date(duel.start_time).getTime() : now;
        const totalDurationSec = 30 * 60; // 30 mins standard duel
        const elapsedSec = Math.floor((now - startTime) / 1000);
        const remaining = Math.max(0, totalDurationSec - elapsedSec);
        updatedMap[duel.id] = remaining;
      });

      setSecondsLeftMap(updatedMap);
    }, 1000);

    return () => clearInterval(interval);
  }, [activeDuels]);

  const formatCountdown = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  if (activeDuels.length === 0 && pendingDuels.length === 0) {
    return null;
  }

  return (
    <div className={styles.container}>
      <AnimatePresence>
        {/* Active Duels */}
        {activeDuels.map((duel) => {
          const isChallenger = duel.challenger_id === currentUserId;
          const opponent = isChallenger ? duel.opponent : duel.challenger;
          const remainingSec = secondsLeftMap[duel.id] ?? 1800;

          const myTime = isChallenger ? duel.challenger_time_sec : duel.opponent_time_sec;
          const opponentTime = isChallenger ? duel.opponent_time_sec : duel.challenger_time_sec;

          return (
            <motion.div
              key={duel.id}
              className={styles.bannerCard}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            >
              <div className={styles.sheenTop} />

              <div className={styles.leftGroup}>
                <div className={styles.iconBox}>
                  <Swords size={20} />
                </div>

                <div className={styles.infoCol}>
                  <div className={styles.titleRow}>
                    <span className={styles.bannerHeading}>Live 1v1 Problem Duel</span>
                    {duel.problem && (
                      <span
                        className={`${styles.difficultyBadge} ${
                          duel.problem.difficulty === 'Easy'
                            ? styles.diffEasy
                            : duel.problem.difficulty === 'Medium'
                            ? styles.diffMedium
                            : styles.diffHard
                        }`}
                      >
                        {duel.problem.difficulty}
                      </span>
                    )}
                  </div>

                  <span className={styles.metaText}>
                    Competing against{' '}
                    <strong className={styles.opponentBadge}>
                      {opponent?.full_name || opponent?.username || 'Peer'}
                    </strong>{' '}
                    on{' '}
                    <strong>{duel.problem?.title || 'Selected Problem'}</strong>
                    {opponentTime && !myTime && ' · Opponent solved first!'}
                    {myTime && ' · You completed your solution!'}
                  </span>
                </div>
              </div>

              <div className={styles.rightGroup}>
                <div className={styles.timerBox}>
                  <Clock size={16} />
                  <span>{formatCountdown(remainingSec)}</span>
                </div>

                <div className={styles.actionsGroup}>
                  {duel.problem && onOpenProblem && (
                    <button
                      type="button"
                      className={styles.solveBtn}
                      onClick={() => onOpenProblem(duel.problem!)}
                    >
                      <ExternalLink size={14} />
                      <span>Open Problem</span>
                    </button>
                  )}

                  {!myTime && onSubmitSolve && (
                    <button
                      type="button"
                      className={styles.acceptBtn}
                      onClick={() => {
                        const elapsed = 1800 - remainingSec;
                        onSubmitSolve(duel.id, Math.max(1, elapsed));
                      }}
                    >
                      <Check size={14} />
                      <span>Submit Solve</span>
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}

        {/* Pending Duels */}
        {pendingDuels.map((duel) => {
          const isChallenger = duel.challenger_id === currentUserId;
          const opponent = isChallenger ? duel.opponent : duel.challenger;

          return (
            <motion.div
              key={duel.id}
              className={styles.bannerCard}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            >
              <div className={styles.sheenTop} />

              <div className={styles.leftGroup}>
                <div className={styles.iconBox}>
                  <Swords size={20} />
                </div>

                <div className={styles.infoCol}>
                  <div className={styles.titleRow}>
                    <span className={styles.bannerHeading}>Duel Challenge Request</span>
                  </div>

                  <span className={styles.metaText}>
                    {isChallenger ? (
                      <>
                        Awaiting challenge acceptance from{' '}
                        <strong>{opponent?.full_name || 'peer'}</strong> on{' '}
                        <strong>{duel.problem?.title || 'Problem'}</strong>.
                      </>
                    ) : (
                      <>
                        <strong>{opponent?.full_name || 'Peer'}</strong> challenged you to solve{' '}
                        <strong>{duel.problem?.title || 'Problem'}</strong> (30 min timer).
                      </>
                    )}
                  </span>
                </div>
              </div>

              {!isChallenger && (
                <div className={styles.rightGroup}>
                  <div className={styles.actionsGroup}>
                    <button
                      type="button"
                      className={styles.acceptBtn}
                      onClick={() => onAcceptDuel(duel.id)}
                    >
                      <Check size={14} />
                      <span>Accept Challenge</span>
                    </button>
                    <button
                      type="button"
                      className={styles.declineBtn}
                      onClick={() => onDeclineDuel(duel.id)}
                    >
                      <X size={14} />
                      <span>Decline</span>
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};

export default DuelBanner;
