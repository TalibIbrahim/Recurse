'use client';

import React, { useMemo, useState } from 'react';
import { CheckCircle2, ExternalLink, PencilLine, Puzzle, ListChecks } from 'lucide-react';
import styles from './RecentSolves.module.css';
import GlassCard from '../ui/GlassCard';
import { Attempt, Problem } from '../../data/types';
import { formatRelativeTime, problemLabel } from '../../lib/format';

export interface RecentSolvesProps {
  attempts: readonly Attempt[];
  onEditAttempt: (problem: Problem, attempt: Attempt) => void;
}

const COLLAPSED_COUNT = 6;

export const RecentSolves: React.FC<RecentSolvesProps> = ({ attempts, onEditAttempt }) => {
  const [expanded, setExpanded] = useState(false);

  const solves = useMemo(
    () => attempts.filter((a) => a.status === 'solved' && a.problem),
    [attempts]
  );
  const visible = expanded ? solves : solves.slice(0, COLLAPSED_COUNT);

  return (
    <GlassCard variant="default" className={styles.container}>
      <div className={styles.headerRow}>
        <div className={styles.heading}>
          <ListChecks size={18} className="text-accent-green" />
          <span>My Solves</span>
        </div>
        <span className={styles.countPill}>{solves.length} total</span>
      </div>

      {solves.length > 0 ? (
        <>
          <ul className={styles.list}>
            {visible.map((att) => {
              const problem = att.problem!;
              const fromExtension = Boolean(att.logged_via_extension);
              const diffClass =
                problem.difficulty === 'Easy'
                  ? styles.diffEasy
                  : problem.difficulty === 'Medium'
                  ? styles.diffMed
                  : styles.diffHard;

              return (
                <li key={att.id} className={styles.row}>
                  <CheckCircle2 size={16} className={styles.checkIcon} />
                  <div className={styles.rowMain}>
                    <a
                      href={att.submission_url || problem.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.title}
                      title={problemLabel(problem)}
                    >
                      {problemLabel(problem)}
                      <ExternalLink size={11} className={styles.externalIcon} />
                    </a>
                    <div className={styles.meta}>
                      <span className={diffClass}>{problem.difficulty}</span>
                      <span aria-hidden="true">·</span>
                      <span>{formatRelativeTime(att.solved_at)}</span>
                      {fromExtension && (
                        <span className={styles.sourcePill} title="Detected by the Recurse browser extension">
                          <Puzzle size={10} />
                          Extension
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    className={styles.editBtn}
                    onClick={() => onEditAttempt(problem, att)}
                    aria-label={`Add notes for ${problem.title}`}
                    title={fromExtension ? 'Add approach notes' : 'Edit log'}
                  >
                    <PencilLine size={14} />
                  </button>
                </li>
              );
            })}
          </ul>

          {solves.length > COLLAPSED_COUNT && (
            <button
              type="button"
              className={styles.toggleBtn}
              onClick={() => setExpanded((v) => !v)}
            >
              {expanded ? 'Show less' : `Show all ${solves.length}`}
            </button>
          )}
        </>
      ) : (
        <div className={styles.empty}>
          <ListChecks size={28} />
          <span>
            No solves yet. Solve a problem on LeetCode with the extension connected, or log one from
            the Problems tab.
          </span>
        </div>
      )}
    </GlassCard>
  );
};

export default RecentSolves;
