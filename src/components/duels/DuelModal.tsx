'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Swords,
  X,
  Shuffle,
  Clock,
  User,
  BookOpen,
} from 'lucide-react';
import styles from './DuelModal.module.css';
import { FriendWithStatus, Problem } from '../../data/types';

export interface DuelModalProps {
  isOpen: boolean;
  onClose: () => void;
  friends: readonly FriendWithStatus[];
  problems: readonly Problem[];
  onSendChallenge: (
    opponentId: string,
    problemId: string
  ) => Promise<{ success: boolean; error?: string }>;
}

export const DuelModal: React.FC<DuelModalProps> = ({
  isOpen,
  onClose,
  friends,
  problems,
  onSendChallenge,
}) => {
  const [selectedOpponentId, setSelectedOpponentId] = useState<string>(
    friends[0]?.profile.id || ''
  );
  const [selectedProblemId, setSelectedProblemId] = useState<string>(
    problems[0]?.id || ''
  );
  const [durationMinutes, setDurationMinutes] = useState<15 | 30 | 45>(30);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handlePickRandomProblem = () => {
    if (problems.length === 0) return;
    const randomIndex = Math.floor(Math.random() * problems.length);
    setSelectedProblemId(problems[randomIndex].id);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOpponentId || !selectedProblemId) {
      setStatusMessage('Please select both a peer and a problem.');
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);

    try {
      const res = await onSendChallenge(selectedOpponentId, selectedProblemId);
      if (res.success) {
        onClose();
      } else {
        setStatusMessage(res.error || 'Failed to send challenge');
      }
    } finally {
      setIsSubmitting(false);
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
            <div className={styles.headerTextCol}>
              <div className={styles.badgeLine}>
                <Swords size={14} />
                <span>1v1 Head-to-Head</span>
              </div>
              <h2 className={styles.title}>Challenge Peer to Duel</h2>
              <span className={styles.subtitle}>
                Both participants receive a synchronized solve timer. The fastest clean submission wins.
              </span>
            </div>

            <button
              type="button"
              className={styles.closeButton}
              onClick={onClose}
              aria-label="Close duel challenge modal"
            >
              <X size={16} />
            </button>
          </div>

          <form className={styles.form} onSubmit={handleSubmit}>
            {/* Opponent Selector */}
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel} htmlFor="opponentSelect">
                Select Peer Opponent
              </label>
              {friends.length > 0 ? (
                <select
                  id="opponentSelect"
                  className={styles.selectInput}
                  value={selectedOpponentId}
                  onChange={(e) => setSelectedOpponentId(e.target.value)}
                >
                  {friends.map((f) => (
                    <option key={f.profile.id} value={f.profile.id}>
                      {f.profile.full_name} (@{f.profile.username}) · {f.current_streak}d streak
                    </option>
                  ))}
                </select>
              ) : (
                <p className={styles.subtitle}>
                  No accountability friends added yet. Connect with a friend in the Friends tab to challenge them!
                </p>
              )}
            </div>

            {/* Problem Selector */}
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel} htmlFor="problemSelect">
                Select Challenge Problem
              </label>
              <div className={styles.problemPickRow}>
                <select
                  id="problemSelect"
                  className={styles.selectInput}
                  value={selectedProblemId}
                  onChange={(e) => setSelectedProblemId(e.target.value)}
                >
                  {problems.map((p) => (
                    <option key={p.id} value={p.id}>
                      #{p.frontend_id} {p.title} ({p.difficulty})
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  className={styles.randomBtn}
                  onClick={handlePickRandomProblem}
                  title="Pick a random problem"
                >
                  <Shuffle size={14} />
                  <span>Random</span>
                </button>
              </div>
            </div>

            {/* Duel Timer Duration */}
            <div className={styles.fieldGroup}>
              <div className={styles.fieldLabel}>Solve Window Duration</div>
              <div className={styles.durationGrid}>
                {([15, 30, 45] as const).map((mins) => {
                  const isActive = durationMinutes === mins;
                  return (
                    <button
                      key={mins}
                      type="button"
                      className={`${styles.durationPill} ${
                        isActive ? styles.durationPillActive : ''
                      }`}
                      onClick={() => setDurationMinutes(mins)}
                    >
                      <Clock size={14} />
                      <span>{mins} Minutes</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {statusMessage && (
              <p className="text-xs text-accent-orange font-medium">{statusMessage}</p>
            )}

            {/* Action Buttons */}
            <div className={styles.actionRow}>
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
                className={styles.submitBtn}
                disabled={isSubmitting || friends.length === 0}
              >
                <Swords size={14} />
                <span>{isSubmitting ? 'Sending...' : 'Send Challenge'}</span>
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default DuelModal;
