'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, MessageSquare, Trash2 } from 'lucide-react';
import styles from './ProblemCommentsModal.module.css';
import { ProblemComment } from '../../data/types';

export interface ProblemCommentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  problemTitle: string;
  comments: readonly ProblemComment[];
  currentUserId?: string;
  onAddComment: (body: string) => Promise<unknown>;
  onDeleteComment: (commentId: string) => Promise<unknown>;
}

function formatRelativeTime(isoString: string): string {
  try {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  } catch {
    return 'recently';
  }
}

export const ProblemCommentsModal: React.FC<ProblemCommentsModalProps> = ({
  isOpen,
  onClose,
  problemTitle,
  comments,
  currentUserId,
  onAddComment,
  onDeleteComment,
}) => {
  const [commentText, setCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    setIsSubmitting(true);
    try {
      await onAddComment(commentText.trim());
      setCommentText('');
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
            <div className={styles.titleArea}>
              <h3 className={styles.title}>Approach & Unstuck Discussion</h3>
              <p className={styles.subtitle}>Peer notes on {problemTitle}</p>
            </div>
            <button
              type="button"
              className={styles.closeButton}
              onClick={onClose}
              aria-label="Close dialog"
            >
              <X size={16} />
            </button>
          </div>

          {/* Comments Thread */}
          <div className={styles.commentsList}>
            {comments.length > 0 ? (
              comments.map((comment) => {
                const isAuthor = currentUserId && comment.author_id === currentUserId;
                return (
                  <div key={comment.id} className={styles.commentItem}>
                    <img
                      src={
                        comment.author?.avatar_url ||
                        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'
                      }
                      alt={comment.author?.full_name || 'User'}
                      className={styles.avatar}
                    />

                    <div className={styles.commentBubble}>
                      <div className={styles.commentMeta}>
                        <span className={styles.authorName}>
                          {comment.author?.full_name || 'Grinder'}
                        </span>
                        <div className="flex items-center">
                          <span className={styles.timeLabel}>
                            {formatRelativeTime(comment.created_at)}
                          </span>
                          {isAuthor && (
                            <button
                              type="button"
                              className={styles.deleteBtn}
                              onClick={() => onDeleteComment(comment.id)}
                              title="Delete comment"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      </div>

                      <p className={styles.commentBody}>{comment.body}</p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className={styles.emptyComments}>
                <MessageSquare size={32} />
                <span>No discussion comments yet. Share an insight or ask how your peers solved this!</span>
              </div>
            )}
          </div>

          {/* Comment Input Footer */}
          <div className={styles.inputFooter}>
            <form onSubmit={handleSubmit} className={styles.inputRow}>
              <input
                type="text"
                className={styles.textInput}
                placeholder="Write an insight or question..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
              />
              <button
                type="submit"
                disabled={isSubmitting || !commentText.trim()}
                className={styles.sendBtn}
                aria-label="Post comment"
              >
                <Send size={15} />
              </button>
            </form>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ProblemCommentsModal;
