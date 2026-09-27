'use client';

import React from 'react';
import { RefreshCw, CheckCircle2, RotateCcw, AlertTriangle, ArrowRight } from 'lucide-react';
import styles from './NeedsRevisitSection.module.css';
import GlassCard from '../ui/GlassCard';
import { Attempt, Problem } from '../../data/types';

export interface NeedsRevisitSectionProps {
  revisitProblems: readonly Attempt[];
  onMarkReviewed: (attemptId: string) => Promise<void>;
  onSolveAgain: (problem: Problem, attempt: Attempt) => void;
}

function calculateDaysAgo(isoDate: string): number {
  try {
    const diffMs = Date.now() - new Date(isoDate).getTime();
    return Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  } catch {
    return 1;
  }
}

export const NeedsRevisitSection: React.FC<NeedsRevisitSectionProps> = ({
  revisitProblems,
  onMarkReviewed,
  onSolveAgain,
}) => {
  return (
    <GlassCard variant="default" glow={revisitProblems.length > 0 ? 'purple' : 'none'} className={styles.container}>
      <div className={styles.headerRow}>
        <div className={styles.titleArea}>
          <div className={styles.iconWrapper}>
            <RotateCcw size={18} />
          </div>
          <div>
            <div className={styles.heading}>Spaced Repetition & Revisit Queue</div>
            <div className={styles.subheading}>
              Problems flagged or solved &gt;3 days ago to solidify retention
            </div>
          </div>
        </div>

        {revisitProblems.length > 0 && (
          <span className={styles.countBadge}>
            {revisitProblems.length} {revisitProblems.length === 1 ? 'problem' : 'problems'} due
          </span>
        )}
      </div>

      {revisitProblems.length > 0 ? (
        <div className={styles.cardsGrid}>
          {revisitProblems.map((att) => {
            const prob = att.problem;
            if (!prob) return null;

            const daysAgo = calculateDaysAgo(att.solved_at);
            const diffClass =
              prob.difficulty === 'Easy'
                ? styles.diffEasy
                : prob.difficulty === 'Medium'
                ? styles.diffMed
                : styles.diffHard;

            return (
              <div key={att.id} className={styles.problemCard}>
                <div>
                  <div className={styles.cardTop}>
                    <h4 className={styles.cardTitle}>
                      #{prob.frontend_id} {prob.title}
                    </h4>
                  </div>
                  <div className={styles.cardMeta}>
                    <span className={diffClass}>{prob.difficulty}</span>
                    <span>•</span>
                    <span className="text-label-tertiary">Solved {daysAgo}d ago</span>
                    {att.pattern_tag && (
                      <>
                        <span>•</span>
                        <span className="text-accent-blue font-medium">{att.pattern_tag}</span>
                      </>
                    )}
                  </div>
                </div>

                {att.approach_notes && (
                  <div className={styles.notesQuote}>“{att.approach_notes}”</div>
                )}

                <div className={styles.cardActions}>
                  <button
                    type="button"
                    className={styles.reviewedBtn}
                    onClick={() => onMarkReviewed(att.id)}
                    title="Mark reviewed without logging new code"
                  >
                    <CheckCircle2 size={13} />
                    <span>Mark Reviewed</span>
                  </button>

                  <button
                    type="button"
                    className={styles.solveAgainBtn}
                    onClick={() => onSolveAgain(prob, att)}
                  >
                    <span>Re-solve Now</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className={styles.emptyState}>
          <CheckCircle2 size={20} className="text-accent-green" />
          <span>All spaced repetition reviews are caught up! Keep grinding today's problems.</span>
        </div>
      )}
    </GlassCard>
  );
};

export default NeedsRevisitSection;
