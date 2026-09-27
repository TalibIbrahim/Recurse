'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  CheckCircle2,
  Clock,
  AlertCircle,
  Trash2,
  Play,
  Pause,
  RotateCcw,
} from 'lucide-react';
import styles from './LogAttemptModal.module.css';
import { Problem, Attempt, AttemptStatus, LogAttemptInput } from '../../data/types';

export interface LogAttemptModalProps {
  isOpen: boolean;
  onClose: () => void;
  problem: Problem | null;
  existingAttempt?: Attempt;
  onSaveAttempt: (input: LogAttemptInput) => Promise<{ success: boolean; error?: string }>;
  onUpdateAttempt: (
    attemptId: string,
    updates: Partial<LogAttemptInput>
  ) => Promise<{ success: boolean; error?: string }>;
  onDeleteAttempt?: (attemptId: string) => Promise<{ success: boolean; error?: string }>;
}

const CONFIDENCE_LEVELS = [
  { level: 1 as const, title: 'Shaky / Guessed', desc: 'Solved through guesswork or unsure logic' },
  { level: 2 as const, title: 'Heavy Hints', desc: 'Required editorial or testcase hints' },
  { level: 3 as const, title: 'Concept Got, Slow', desc: 'Identified pattern, implementation was slow' },
  { level: 4 as const, title: 'Clean Solution', desc: 'Solid optimal approach without help' },
  { level: 5 as const, title: 'Mastered / Can Teach', desc: 'Instant pattern recall & edge-case mastery' },
] as const;

export const LogAttemptModal: React.FC<LogAttemptModalProps> = ({
  isOpen,
  onClose,
  problem,
  existingAttempt,
  onSaveAttempt,
  onUpdateAttempt,
  onDeleteAttempt,
}) => {
  const [status, setStatus] = useState<AttemptStatus>('solved');
  const [patternTag, setPatternTag] = useState('');
  const [timeComplexity, setTimeComplexity] = useState('O(N)');
  const [spaceComplexity, setSpaceComplexity] = useState('O(1)');
  const [timeSpentMin, setTimeSpentMin] = useState<number | ''>(20);
  const [submissionUrl, setSubmissionUrl] = useState('');
  const [approachNotes, setApproachNotes] = useState('');
  const [needsRevisit, setNeedsRevisit] = useState(false);
  const [confidenceRating, setConfidenceRating] = useState<1 | 2 | 3 | 4 | 5>(4);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Attempt Stopwatch / Timer State
  const [timerSeconds, setTimerSeconds] = useState<number>(0);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (isOpen && problem) {
      if (existingAttempt) {
        setStatus(existingAttempt.status);
        setPatternTag(existingAttempt.pattern_tag || problem.tags[0] || '');
        setTimeComplexity(existingAttempt.time_complexity || 'O(N)');
        setSpaceComplexity(existingAttempt.space_complexity || 'O(1)');
        const existingMinutes = existingAttempt.time_spent_min ?? 20;
        setTimeSpentMin(existingMinutes);
        setTimerSeconds(existingMinutes * 60);
        setSubmissionUrl(existingAttempt.submission_url || problem.url || '');
        setApproachNotes(existingAttempt.approach_notes || '');
        setNeedsRevisit(existingAttempt.needs_revisit || false);
        setConfidenceRating(existingAttempt.confidence_rating || 4);
      } else {
        setStatus('solved');
        setPatternTag(problem.tags[0] || 'General');
        setTimeComplexity('O(N)');
        setSpaceComplexity('O(1)');
        setTimeSpentMin(20);
        setTimerSeconds(20 * 60);
        setSubmissionUrl(problem.url || '');
        setApproachNotes('');
        setNeedsRevisit(false);
        setConfidenceRating(4);
      }
      setIsTimerRunning(false);
    }
  }, [isOpen, problem, existingAttempt]);

  // Stopwatch Interval Effect
  useEffect(() => {
    if (isTimerRunning) {
      timerRef.current = window.setInterval(() => {
        setTimerSeconds((prev) => {
          const next = prev + 1;
          // Auto-fill time_spent_min
          const mins = Math.max(1, Math.round(next / 60));
          setTimeSpentMin(mins);
          return next;
        });
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isTimerRunning]);

  const toggleTimer = () => {
    setIsTimerRunning((prev) => !prev);
  };

  const resetTimer = () => {
    setIsTimerRunning(false);
    setTimerSeconds(0);
    setTimeSpentMin(0);
  };

  const formatTimer = (totalSeconds: number): string => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  if (!isOpen || !problem) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const inputData: LogAttemptInput = {
      problem_id: problem.id,
      status,
      pattern_tag: patternTag.trim() || undefined,
      time_complexity: timeComplexity.trim() || undefined,
      space_complexity: spaceComplexity.trim() || undefined,
      time_spent_min: typeof timeSpentMin === 'number' ? timeSpentMin : undefined,
      submission_url: submissionUrl.trim() || undefined,
      approach_notes: approachNotes.trim() || undefined,
      needs_revisit: needsRevisit,
      confidence_rating: status === 'solved' ? confidenceRating : undefined,
    };

    try {
      if (existingAttempt) {
        await onUpdateAttempt(existingAttempt.id, inputData);
      } else {
        await onSaveAttempt(inputData);
      }
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!existingAttempt || !onDeleteAttempt) return;
    if (window.confirm('Are you sure you want to delete this attempt record?')) {
      setIsSubmitting(true);
      try {
        await onDeleteAttempt(existingAttempt.id);
        onClose();
      } finally {
        setIsSubmitting(false);
      }
    }
  };

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
          <div className={styles.modalHeader}>
            <div className={styles.titleArea}>
              <div className={styles.problemBadgeLine}>
                <span>#{problem.frontend_id}</span>
                <span>•</span>
                <span>{problem.difficulty}</span>
              </div>
              <h2 className={styles.title}>{problem.title}</h2>
            </div>
            <button
              type="button"
              className={styles.closeButton}
              onClick={onClose}
              aria-label="Close modal"
            >
              <X size={16} />
            </button>
          </div>

          <form className={styles.form} onSubmit={handleSubmit}>
            {/* Status Selection */}
            <div>
              <div className={styles.sectionLabel}>Attempt Status</div>
              <div className={styles.statusSelector}>
                <button
                  type="button"
                  className={`${styles.statusOption} ${
                    status === 'solved' ? styles.statusSolvedActive : ''
                  }`}
                  onClick={() => setStatus('solved')}
                >
                  <CheckCircle2 size={15} />
                  <span>Solved</span>
                </button>
                <button
                  type="button"
                  className={`${styles.statusOption} ${
                    status === 'attempted' ? styles.statusAttemptedActive : ''
                  }`}
                  onClick={() => setStatus('attempted')}
                >
                  <Clock size={15} />
                  <span>Attempted</span>
                </button>
                <button
                  type="button"
                  className={`${styles.statusOption} ${
                    status === 'needs_review' ? styles.statusReviewActive : ''
                  }`}
                  onClick={() => setStatus('needs_review')}
                >
                  <AlertCircle size={15} />
                  <span>Needs Review</span>
                </button>
              </div>
            </div>

            {/* Stopwatch / Pomodoro Attempt Timer */}
            <div className={styles.timerCard}>
              <div className={styles.timerDisplayGroup}>
                <div
                  className={`${styles.timerIconBox} ${
                    isTimerRunning ? styles.timerIconRunning : ''
                  }`}
                >
                  <Clock size={18} />
                </div>
                <div className={styles.timerTextCol}>
                  <span className={styles.timerLabel}>
                    {isTimerRunning ? 'Timer Active' : 'Solve Stopwatch'}
                  </span>
                  <span className={styles.timerDigitalTime}>
                    {formatTimer(timerSeconds)}
                  </span>
                </div>
              </div>

              <div className={styles.timerControls}>
                <button
                  type="button"
                  className={`${styles.timerBtnPrimary} ${
                    isTimerRunning ? styles.timerBtnRunning : ''
                  }`}
                  onClick={toggleTimer}
                >
                  {isTimerRunning ? <Pause size={14} /> : <Play size={14} />}
                  <span>{isTimerRunning ? 'Pause' : 'Start'}</span>
                </button>
                <button
                  type="button"
                  className={styles.timerBtnSecondary}
                  onClick={resetTimer}
                  title="Reset Stopwatch"
                  aria-label="Reset Stopwatch"
                >
                  <RotateCcw size={14} />
                </button>
              </div>
            </div>

            {/* Confidence Rating (1-5 scale when solved) */}
            {status === 'solved' && (
              <div className={styles.confidenceSection}>
                <div className={styles.sectionLabel}>
                  Confidence Rating (Retention &amp; Speed)
                </div>
                <div
                  className={styles.confidenceGrid}
                  role="radiogroup"
                  aria-label="Confidence rating from 1 to 5"
                >
                  {CONFIDENCE_LEVELS.map((item) => {
                    const isSelected = confidenceRating === item.level;
                    return (
                      <button
                        key={item.level}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        title={item.desc}
                        className={`${styles.confidencePill} ${
                          isSelected ? styles.confidencePillActive : ''
                        }`}
                        onClick={() => setConfidenceRating(item.level)}
                      >
                        <span className={styles.confidenceLevelNumber}>
                          {item.level}
                        </span>
                        <span className={styles.confidenceLevelTitle}>
                          {item.title}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Pattern & Time Spent */}
            <div className={styles.twoColRow}>
              <div className={styles.inputGroup}>
                <label className={styles.sectionLabel} htmlFor="patternTag">
                  Algorithmic Pattern
                </label>
                <input
                  id="patternTag"
                  type="text"
                  placeholder="e.g. Two Pointers, BFS, DP"
                  className={styles.inputField}
                  value={patternTag}
                  onChange={(e) => setPatternTag(e.target.value)}
                />
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.sectionLabel} htmlFor="timeSpent">
                  Time Spent (Minutes)
                </label>
                <input
                  id="timeSpent"
                  type="number"
                  min="0"
                  max="300"
                  placeholder="20"
                  className={styles.inputField}
                  value={timeSpentMin}
                  onChange={(e) => {
                    const val = e.target.value === '' ? '' : Number(e.target.value);
                    setTimeSpentMin(val);
                    if (typeof val === 'number') {
                      setTimerSeconds(val * 60);
                    }
                  }}
                />
              </div>
            </div>

            {/* Complexities */}
            <div className={styles.twoColRow}>
              <div className={styles.inputGroup}>
                <label className={styles.sectionLabel} htmlFor="timeComp">
                  Time Complexity
                </label>
                <input
                  id="timeComp"
                  type="text"
                  placeholder="e.g. O(N) or O(N log N)"
                  className={styles.inputField}
                  value={timeComplexity}
                  onChange={(e) => setTimeComplexity(e.target.value)}
                />
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.sectionLabel} htmlFor="spaceComp">
                  Space Complexity
                </label>
                <input
                  id="spaceComp"
                  type="text"
                  placeholder="e.g. O(1) or O(N)"
                  className={styles.inputField}
                  value={spaceComplexity}
                  onChange={(e) => setSpaceComplexity(e.target.value)}
                />
              </div>
            </div>

            {/* Approach Notes & Insights */}
            <div className={styles.inputGroup}>
              <label className={styles.sectionLabel} htmlFor="approachNotes">
                Approach Notes &amp; Key Insights
              </label>
              <textarea
                id="approachNotes"
                placeholder="What was the key observation? How did you optimize edge cases? Monotonic stack order, pointers movement..."
                className={styles.textareaField}
                value={approachNotes}
                onChange={(e) => setApproachNotes(e.target.value)}
              />
            </div>

            {/* Submission URL */}
            <div className={styles.inputGroup}>
              <label className={styles.sectionLabel} htmlFor="submissionUrl">
                Submission or Solution URL (Optional)
              </label>
              <input
                id="submissionUrl"
                type="url"
                placeholder="https://leetcode.com/problems/.../submissions/..."
                className={styles.inputField}
                value={submissionUrl}
                onChange={(e) => setSubmissionUrl(e.target.value)}
              />
            </div>

            {/* Needs Revisit Flag Toggle */}
            <label className={styles.checkboxRow}>
              <input
                type="checkbox"
                className={styles.checkboxInput}
                checked={needsRevisit}
                onChange={(e) => setNeedsRevisit(e.target.checked)}
              />
              <div className={styles.checkboxLabel}>
                <span>Schedule for Spaced Repetition (Needs Revisit)</span>
                <span className={styles.checkboxHelp}>
                  Flags this problem to be prompted for re-solve in 3 days
                </span>
              </div>
            </label>

            {/* Action Buttons */}
            <div className={styles.actionRow}>
              {existingAttempt && onDeleteAttempt && (
                <button
                  type="button"
                  className={styles.deleteBtn}
                  onClick={handleDelete}
                  disabled={isSubmitting}
                >
                  <Trash2 size={14} />
                  <span>Delete</span>
                </button>
              )}

              <div className={styles.primaryActions}>
                <button
                  type="button"
                  className={styles.cancelBtn}
                  onClick={onClose}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={styles.saveBtn}
                  disabled={isSubmitting}
                >
                  {isSubmitting
                    ? 'Saving...'
                    : existingAttempt
                    ? 'Update Attempt'
                    : 'Record Solve'}
                </button>
              </div>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default LogAttemptModal;
