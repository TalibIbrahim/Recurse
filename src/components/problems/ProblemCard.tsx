'use client';

import React from 'react';
import {
  ExternalLink,
  CheckCircle2,
  Clock,
  AlertCircle,
  MessageSquare,
  BookmarkCheck,
  ChevronRight,
  Code2,
} from 'lucide-react';
import styles from './ProblemCard.module.css';
import GlassCard from '../ui/GlassCard';
import { Problem, Attempt } from '../../data/types';

export interface ProblemCardProps {
  problem: Problem;
  attempt?: Attempt;
  onOpenLogModal: (problem: Problem, attempt?: Attempt) => void;
  onOpenDiscussion: (problem: Problem, attempt?: Attempt) => void;
}

export const ProblemCard: React.FC<ProblemCardProps> = ({
  problem,
  attempt,
  onOpenLogModal,
  onOpenDiscussion,
}) => {
  const status = attempt ? attempt.status : 'unsolved';

  // Glow mapping for GlassCard
  const glowType =
    status === 'solved'
      ? 'green'
      : status === 'attempted'
      ? 'orange'
      : status === 'needs_review'
      ? 'purple'
      : 'none';

  return (
    <GlassCard variant="interactive" glow={glowType}>
      <div className={styles.cardInner}>
        {/* Top Meta Header */}
        <div>
          <div className={styles.topRow}>
            <div className={styles.metaInfo}>
              <span className={styles.idBadge}>#{problem.frontend_id}</span>
              <span
                className={`${styles.diffBadge} ${
                  problem.difficulty === 'Easy'
                    ? styles.diffEasy
                    : problem.difficulty === 'Medium'
                    ? styles.diffMedium
                    : styles.diffHard
                }`}
              >
                {problem.difficulty}
              </span>

              {/* Status Badge */}
              {status === 'solved' && (
                <span className={`${styles.statusPill} ${styles.statusSolved}`}>
                  <CheckCircle2 size={12} />
                  <span>Solved</span>
                </span>
              )}
              {status === 'attempted' && (
                <span className={`${styles.statusPill} ${styles.statusAttempted}`}>
                  <Clock size={12} />
                  <span>Attempted</span>
                </span>
              )}
              {status === 'needs_review' && (
                <span className={`${styles.statusPill} ${styles.statusReview}`}>
                  <AlertCircle size={12} />
                  <span>Needs Review</span>
                </span>
              )}
              {status === 'unsolved' && (
                <span className={`${styles.statusPill} ${styles.statusUnsolved}`}>
                  <span>Unsolved</span>
                </span>
              )}
            </div>

            <a
              href={problem.url}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.externalLink}
              title="Open problem on LeetCode"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink size={15} />
            </a>
          </div>

          {/* Title & Tags */}
          <div className={styles.titleArea} style={{ marginTop: '0.625rem' }}>
            <h3 className={styles.problemTitle}>{problem.title}</h3>
            <div className={styles.tagList}>
              {problem.tags.slice(0, 3).map((tag) => (
                <span key={tag} className={styles.tagPill}>
                  {tag}
                </span>
              ))}
              {problem.tags.length > 3 && (
                <span className={styles.tagPill}>+{problem.tags.length - 3}</span>
              )}
            </div>
          </div>
        </div>

        {/* Approach Notes / Complexities Preview if available */}
        {attempt && (attempt.approach_notes || attempt.pattern_tag) && (
          <div className={styles.notesExcerpt}>
            <div className={styles.notesHeader}>
              <span>{attempt.pattern_tag || 'Key Approach'}</span>
              {attempt.time_complexity && <span>{attempt.time_complexity}</span>}
            </div>
            {attempt.approach_notes && (
              <p className={styles.notesText}>{attempt.approach_notes}</p>
            )}
          </div>
        )}

        {/* Bottom Actions */}
        <div className={styles.bottomActionRow}>
          <div className={styles.quickActionGroup}>
            <button
              type="button"
              className={`${styles.actionBtn} ${
                status === 'solved' ? styles.editAttemptBtn : styles.logSolveBtn
              }`}
              onClick={() => onOpenLogModal(problem, attempt)}
            >
              {status === 'solved' ? (
                <>
                  <BookmarkCheck size={13} />
                  <span>Edit Solve</span>
                </>
              ) : (
                <>
                  <Code2 size={13} />
                  <span>Log Solve</span>
                </>
              )}
            </button>
          </div>

          <button
            type="button"
            className={styles.discussionBtn}
            onClick={() => onOpenDiscussion(problem, attempt)}
            title="Peer discussion & approach notes"
          >
            <MessageSquare size={13} />
            <span>Discuss</span>
          </button>
        </div>
      </div>
    </GlassCard>
  );
};

export default ProblemCard;
