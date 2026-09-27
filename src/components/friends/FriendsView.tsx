'use client';

import React, { useState } from 'react';
import {
  Users,
  Search,
  UserPlus,
  Flame,
  Check,
  X,
  Trash2,
  Bell,
  BellOff,
  Swords,
} from 'lucide-react';
import styles from './FriendsView.module.css';
import GlassCard from '../ui/GlassCard';
import { FriendWithStatus, Friendship, Profile } from '../../data/types';
import { usePokes } from '../../hooks/usePokes';

export interface FriendsViewProps {
  friends: readonly FriendWithStatus[];
  pendingRequests: readonly Friendship[];
  onSearchUsers: (query: string) => Promise<Profile[]>;
  onSendFriendRequest: (targetUserId: string) => Promise<{ success: boolean; error?: string }>;
  onRespondRequest: (
    friendshipId: string,
    action: 'accept' | 'reject'
  ) => Promise<{ success: boolean; error?: string }>;
  onRemoveFriend: (friendshipId: string) => Promise<{ success: boolean; error?: string }>;
  onSelectFriend?: (friend: FriendWithStatus) => void;
  onChallengeFriend?: (friend: FriendWithStatus) => void;
  currentUserId?: string;
}

export const FriendsView: React.FC<FriendsViewProps> = ({
  friends,
  pendingRequests,
  onSearchUsers,
  onSendFriendRequest,
  onRespondRequest,
  onRemoveFriend,
  onSelectFriend,
  onChallengeFriend,
  currentUserId,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [searching, setSearching] = useState(false);
  const [sentMap, setSentMap] = useState<Record<string, boolean>>({});
  const [dismissedPokes, setDismissedPokes] = useState<Record<string, boolean>>({});

  // Pokes & Nudges hook
  const { recentPokes, pokeFriend, canPokeToday } = usePokes(currentUserId);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const results = await onSearchUsers(searchQuery);
      setSearchResults(results);
    } finally {
      setSearching(false);
    }
  };

  const handleSendRequest = async (userId: string) => {
    const res = await onSendFriendRequest(userId);
    if (res.success) {
      setSentMap((prev) => ({ ...prev, [userId]: true }));
    }
  };

  const handleNudgeFriend = async (friendId: string) => {
    await pokeFriend(friendId, 'Friendly reminder to keep your streak alive today!');
  };

  // Visible incoming pokes
  const activeIncomingPokes = recentPokes.filter((p) => !dismissedPokes[p.id]);

  return (
    <div className={styles.container}>
      {/* Incoming Nudges Alert Pill */}
      {activeIncomingPokes.length > 0 && (
        <div className={styles.pokesAlertBanner} role="status">
          <div className={styles.pokeAlertLeft}>
            <div className={styles.pokeAlertIconBox}>
              <Bell size={16} />
            </div>
            <div className={styles.pokeAlertTextCol}>
              <span className={styles.pokeAlertTitle}>
                Peer Accountability Nudge
              </span>
              <span className={styles.pokeAlertSub}>
                {activeIncomingPokes[0].sender?.full_name || 'A peer'} nudged you:{' '}
                &ldquo;{activeIncomingPokes[0].message}&rdquo;
              </span>
            </div>
          </div>

          <button
            type="button"
            className={styles.pokeAlertDismissBtn}
            onClick={() =>
              setDismissedPokes((prev) => ({
                ...prev,
                [activeIncomingPokes[0].id]: true,
              }))
            }
          >
            Acknowledge
          </button>
        </div>
      )}

      {/* Search Bar for Finding LeetCode Peers */}
      <GlassCard variant="default" className={styles.searchCard}>
        <form onSubmit={handleSearch} className={styles.searchBarWrapper}>
          <Search size={16} className={styles.searchIcon} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search LeetCode grinders by username or name to add as accountability friend..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </form>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className={styles.searchResultsList}>
            {searchResults.map((user) => (
              <div key={user.id} className={styles.searchResultRow}>
                <div className={styles.friendProfileGroup}>
                  <img
                    src={user.avatar_url}
                    alt={user.full_name}
                    className={styles.friendAvatar}
                    style={{ width: '2.25rem', height: '2.25rem' }}
                  />
                  <div className={styles.nameGroup}>
                    <span className={styles.friendName}>{user.full_name}</span>
                    <span className={styles.friendHandle}>@{user.username}</span>
                  </div>
                </div>

                {sentMap[user.id] ? (
                  <span className="text-xs text-accent-green flex items-center gap-1 font-semibold">
                    <Check size={14} /> Request Sent
                  </span>
                ) : (
                  <button
                    type="button"
                    className={styles.sendRequestBtn}
                    onClick={() => handleSendRequest(user.id)}
                  >
                    <UserPlus size={14} />
                    <span>Add Friend</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      {/* Pending Friend Requests Section */}
      {pendingRequests.length > 0 && (
        <GlassCard variant="subtle" glow="blue" className={styles.pendingSection}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionTitle}>
              <Users size={16} className="text-accent-blue" />
              <span>Pending Accountability Requests ({pendingRequests.length})</span>
            </div>
          </div>

          {pendingRequests.map((req) => (
            <div key={req.id} className={styles.pendingCard}>
              <div className={styles.friendProfileGroup}>
                <img
                  src={
                    req.friend_profile?.avatar_url ||
                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'
                  }
                  alt={req.friend_profile?.full_name || 'Requester'}
                  className={styles.friendAvatar}
                  style={{ width: '2.25rem', height: '2.25rem' }}
                />
                <div className={styles.nameGroup}>
                  <span className={styles.friendName}>
                    {req.friend_profile?.full_name || 'User'}
                  </span>
                  <span className={styles.friendHandle}>
                    @{req.friend_profile?.username || 'user'} wants to connect
                  </span>
                </div>
              </div>

              <div className={styles.pendingActions}>
                <button
                  type="button"
                  className={styles.acceptBtn}
                  onClick={() => onRespondRequest(req.id, 'accept')}
                >
                  Accept
                </button>
                <button
                  type="button"
                  className={styles.rejectBtn}
                  onClick={() => onRespondRequest(req.id, 'reject')}
                >
                  Decline
                </button>
              </div>
            </div>
          ))}
        </GlassCard>
      )}

      {/* Friends Grid */}
      <div className={styles.friendsGrid}>
        {friends.map((friend) => {
          const eligibleToPoke = canPokeToday(friend.profile.id);

          return (
            <GlassCard key={friend.friendship_id} variant="default">
              <div className={styles.friendCardInner}>
                <div className={styles.cardHeaderRow}>
                  <div className={styles.friendProfileGroup}>
                    <div className={styles.avatarContainer}>
                      <img
                        src={friend.profile.avatar_url}
                        alt={friend.profile.full_name}
                        className={styles.friendAvatar}
                      />
                      {friend.is_online && <div className={styles.onlineBadge} />}
                    </div>
                    <div className={styles.nameGroup}>
                      <span className={styles.friendName}>{friend.profile.full_name}</span>
                      <span className={styles.friendHandle}>@{friend.profile.username}</span>
                    </div>
                  </div>

                  <div className={styles.streakPill}>
                    <Flame size={14} className="text-accent-orange" />
                    <span>{friend.current_streak}d</span>
                  </div>
                </div>

                <div className={styles.friendStatsRow}>
                  <div className={styles.statItem}>
                    <span className={styles.statLabel}>Solved Today</span>
                    <span className={styles.statVal}>{friend.solved_today_count} solves</span>
                  </div>
                  <div className={styles.statItem}>
                    <span className={styles.statLabel}>Weekly Points</span>
                    <span className={styles.statVal}>{friend.weekly_points} pts</span>
                  </div>
                </div>

                <div className={styles.friendActions}>
                  <div className={styles.actionButtonGroup}>
                    {/* 1-Tap Nudge / Poke Button */}
                    <button
                      type="button"
                      disabled={!eligibleToPoke}
                      className={`${styles.pokeBtn} ${
                        !eligibleToPoke ? styles.pokeBtnDisabled : ''
                      }`}
                      onClick={() => handleNudgeFriend(friend.profile.id)}
                      title={
                        eligibleToPoke
                          ? 'Send 1-tap peer nudge'
                          : 'You can only nudge this peer once every 24 hours'
                      }
                    >
                      {eligibleToPoke ? <Bell size={13} /> : <BellOff size={13} />}
                      <span>{eligibleToPoke ? 'Nudge' : 'Poked Today'}</span>
                    </button>

                    {/* Duel Button */}
                    {onChallengeFriend && (
                      <button
                        type="button"
                        className={styles.duelPeerBtn}
                        onClick={() => onChallengeFriend(friend)}
                        title="Challenge to 1v1 problem duel"
                      >
                        <Swords size={13} />
                        <span>Duel</span>
                      </button>
                    )}
                  </div>

                  <div className={styles.actionButtonGroup}>
                    <button
                      type="button"
                      className={styles.removeBtn}
                      onClick={() => onRemoveFriend(friend.friendship_id)}
                      title="Remove friend"
                      aria-label="Remove friend"
                    >
                      <Trash2 size={14} />
                    </button>

                    {onSelectFriend && (
                      <button
                        type="button"
                        className={styles.viewSolvesBtn}
                        onClick={() => onSelectFriend(friend)}
                      >
                        <span>View Solves</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </GlassCard>
          );
        })}
      </div>
    </div>
  );
};

export default FriendsView;
