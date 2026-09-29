'use client';

import React from 'react';
import { Activity, Clock, MessageSquare, CheckCircle2, Award } from 'lucide-react';
import styles from './FriendActivityFeed.module.css';
import GlassCard from '../ui/GlassCard';
import { Attempt } from '../../data/types';
import { formatRelativeTime, problemLabel } from '../../lib/format';

export interface FriendActivityFeedProps {
  friendAttempts: readonly Attempt[];
  onOpenDiscussion: (attempt: Attempt) => void;
}

export const FriendActivityFeed: React.FC<FriendActivityFeedProps> = ({
  friendAttempts,
  onOpenDiscussion,
}) => {
  return (
    <GlassCard variant="default" className={styles.container}>
      <div className={styles.headerRow}>
        <div className={styles.heading}>
          <Activity size={18} className="text-accent-blue" />
          <span>Peer Practice Feed</span>
        </div>
      </div>

      {friendAttempts.length > 0 ? (
        <div className={styles.feedList}>
          {friendAttempts.map((att) => {
            const problem = att.problem;
            const user = att.user;
            const diffClass =
              problem?.difficulty === 'Easy'
                ? styles.diffEasy
                : problem?.difficulty === 'Medium'
                ? styles.diffMed
                : styles.diffHard;

            return (
              <div key={att.id} className={styles.activityItem}>
                <img
                  src={
                    user?.avatar_url ||
                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'
                  }
                  alt={user?.full_name || 'Friend'}
                  className={styles.avatar}
                />

                <div className={styles.contentCol}>
                  <div className={styles.actorRow}>
                    <div>
                      <span className={styles.actorName}>{user?.full_name || 'Friend'}</span>{' '}
                      <span className={styles.actionVerb}>
                        {att.status === 'solved' ? 'solved' : 'attempted'}
                      </span>
                    </div>
                    <span className={styles.timeAgo}>{formatRelativeTime(att.solved_at)}</span>
                  </div>

                  {problem && (
                    <div className={styles.problemBadge}>
                      <span className={diffClass}>[{problem.difficulty}]</span>
                      <span>{problemLabel(problem)}</span>
                    </div>
                  )}

                  {att.approach_notes && (
                    <div className={styles.notesQuote}>“{att.approach_notes}”</div>
                  )}

                  <div className={styles.metaTagsRow}>
                    {att.pattern_tag && <span>Pattern: {att.pattern_tag}</span>}
                    {att.time_complexity && <span>Time: {att.time_complexity}</span>}
                    {att.time_spent_min != null && att.time_spent_min > 0 && (
                      <span className="flex items-center gap-1">
                        <Clock size={12} /> {att.time_spent_min} min
                      </span>
                    )}

                    <button
                      type="button"
                      className={styles.discussBtn}
                      onClick={() => onOpenDiscussion(att)}
                    >
                      <MessageSquare size={13} />
                      <span>Discussion</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className={styles.emptyFeed}>
          <Award size={32} />
          <span>No peer activity yet. Add friends to see their solves here.</span>
        </div>
      )}
    </GlassCard>
  );
};

export default FriendActivityFeed;
