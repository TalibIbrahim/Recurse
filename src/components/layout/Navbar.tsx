'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Flame,
  BookOpen,
  Users,
  Trophy,
  BarChart3,
  ChevronDown,
  LogOut,
  User,
  Menu,
  X,
  Sparkles,
  Swords,
  Share2,
  Puzzle,
} from 'lucide-react';
import styles from './Navbar.module.css';
import { Profile } from '../../data/types';
import { RecurseLogo } from '../ui/RecurseLogo';

export type NavTabId = 'today' | 'problems' | 'friends' | 'leaderboard' | 'activity';

export interface NavbarProps {
  activeTab: NavTabId;
  onTabChange: (tab: NavTabId) => void;
  streakCount: number;
  currentProfile: Profile | null;
  onOpenAuthModal: () => void;
  onSignOut: () => void;
  onOpenRecap?: () => void;
  onOpenDuel?: () => void;
  onOpenShareCard?: () => void;
  onOpenExtensionGuide?: () => void;
  activeDuelsCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  streakCount,
  currentProfile,
  onOpenAuthModal,
  onSignOut,
  onOpenRecap,
  onOpenDuel,
  onOpenShareCard,
  onOpenExtensionGuide,
  activeDuelsCount = 0,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navItems: { id: NavTabId; label: string; icon: React.ReactNode }[] = [
    { id: 'today', label: 'Today', icon: <Sparkles size={16} /> },
    { id: 'problems', label: 'Problems', icon: <BookOpen size={16} /> },
    { id: 'friends', label: 'Friends', icon: <Users size={16} /> },
    { id: 'leaderboard', label: 'Leaderboard', icon: <Trophy size={16} /> },
    { id: 'activity', label: 'Stats & Heatmap', icon: <BarChart3 size={16} /> },
  ];

  return (
    <header className={styles.navHeader}>
      <div className={styles.sheenLine} />
      <div className={styles.navContainer}>
        {/* Brand Group */}
        <div
          className={styles.brandGroup}
          onClick={() => onTabChange('today')}
          role="button"
          tabIndex={0}
          aria-label="Recurse Home"
        >
          <RecurseLogo size={19} showWordmark={true} />
        </div>

        {/* Desktop Navigation Tabs */}
        <nav className={styles.desktopNav} aria-label="Main Navigation">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                className={`${styles.navTabButton} ${isActive ? styles.navTabActive : ''}`}
                onClick={() => onTabChange(item.id)}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeTabPill"
                    className={styles.tabActivePill}
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  />
                )}
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right Action Icons & User Account */}
        <div className={styles.rightActions}>
          {/* Quick Duel Button */}
          {onOpenDuel && (
            <button
              type="button"
              className={styles.headerActionBtn}
              onClick={onOpenDuel}
              title="1v1 Algorithmic Duel"
            >
              <Swords size={15} className="text-accent-purple" />
              <span>Duel</span>
              {activeDuelsCount > 0 && (
                <span className={styles.badgeCount}>{activeDuelsCount}</span>
              )}
            </button>
          )}

          {/* Weekly Recap Button */}
          {onOpenRecap && (
            <button
              type="button"
              className={styles.headerActionBtn}
              onClick={onOpenRecap}
              title="Weekly Performance Recap"
            >
              <BarChart3 size={14} className="text-accent-green" />
              <span>Recap</span>
            </button>
          )}

          {/* Share Stat Card Button */}
          {onOpenShareCard && (
            <button
              type="button"
              className={styles.headerActionBtn}
              onClick={onOpenShareCard}
              title="Share Developer Stat Card"
            >
              <Share2 size={14} className="text-accent-orange" />
              <span>Card</span>
            </button>
          )}

          {/* Extension Integration Button */}
          {onOpenExtensionGuide && (
            <button
              type="button"
              className={styles.headerActionBtn}
              onClick={onOpenExtensionGuide}
              title="Browser Companion Extension"
            >
              <Puzzle size={14} className="text-accent-blue" />
              <span>Extension</span>
            </button>
          )}

          {/* Streak Indicator Pill */}
          <div className={styles.streakPill} title={`${streakCount} day consistency streak`}>
            <Flame size={16} className={styles.flameIcon} />
            <span>{streakCount}d</span>
          </div>

          {/* User Profile Dropdown */}
          <div className={styles.userSwitcherWrapper} ref={dropdownRef}>
            <button
              type="button"
              className={styles.switcherTrigger}
              onClick={() => setDropdownOpen((prev) => !prev)}
              aria-expanded={dropdownOpen}
              aria-label="User account"
            >
              <img
                src={
                  currentProfile?.avatar_url ||
                  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'
                }
                alt={currentProfile?.full_name || 'User'}
                className={styles.userAvatarMini}
              />
              <div className="hidden sm:flex flex-col text-left">
                <span className="font-semibold text-xs text-label-primary leading-tight">
                  {currentProfile?.full_name?.split(' ')[0] || currentProfile?.username || 'Account'}
                </span>
                {currentProfile?.identity_label && (
                  <span className="text-[10px] font-medium text-accent-blue leading-none">
                    {currentProfile.identity_label.title}
                  </span>
                )}
              </div>
              <ChevronDown size={14} />
            </button>

            <AnimatePresence>
              {dropdownOpen && (
                <motion.div
                  className={styles.userDropdownMenu}
                  initial={{ opacity: 0, y: -8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.96 }}
                  transition={{ type: 'spring', stiffness: 450, damping: 28 }}
                >
                  {currentProfile ? (
                    <>
                      <div className="px-4 py-3 border-b border-[rgba(255,255,255,0.08)]">
                        <div className="font-semibold text-sm text-[#F4F4F5]">
                          {currentProfile.full_name || currentProfile.username}
                        </div>
                        <div className="text-xs text-[#71717A] truncate">
                          @{currentProfile.username}
                        </div>
                        {currentProfile.identity_label && (
                          <div className="mt-2 inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-[rgba(10,132,255,0.12)] text-[#0A84FF] border border-[rgba(10,132,255,0.2)]">
                            {currentProfile.identity_label.title}
                          </div>
                        )}
                      </div>

                      <div className="p-1">
                        <button
                          type="button"
                          className={styles.dropdownItem}
                          onClick={() => {
                            setDropdownOpen(false);
                            onTabChange('activity');
                          }}
                        >
                          <BarChart3 size={15} />
                          <span>My Stats &amp; Heatmap</span>
                        </button>

                        <button
                          type="button"
                          className={styles.dropdownItem}
                          onClick={() => {
                            setDropdownOpen(false);
                            onTabChange('friends');
                          }}
                        >
                          <Users size={15} />
                          <span>My Peer Pod</span>
                        </button>
                      </div>

                      <div className={styles.divider} />

                      <button
                        type="button"
                        className={styles.signOutButton}
                        onClick={() => {
                          setDropdownOpen(false);
                          onSignOut();
                        }}
                      >
                        <LogOut size={15} />
                        <span>Sign Out</span>
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className={styles.dropdownItem}
                      onClick={() => {
                        setDropdownOpen(false);
                        onOpenAuthModal();
                      }}
                    >
                      <User size={15} />
                      <span>Sign In / Create Account</span>
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Auth modal button if not logged in */}
          {!currentProfile && (
            <button
              type="button"
              className={styles.signInButton}
              onClick={onOpenAuthModal}
            >
              <span>Sign In</span>
            </button>
          )}

          {/* Mobile hamburger menu toggle */}
          <button
            type="button"
            className={styles.mobileMenuButton}
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            className={styles.mobileDrawer}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          >
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`${styles.mobileTabButton} ${
                    isActive ? styles.mobileTabActive : ''
                  }`}
                  onClick={() => {
                    onTabChange(item.id);
                    setMobileMenuOpen(false);
                  }}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              );
            })}

            {/* Quick Tools for Mobile/Tablet */}
            <div className={styles.mobileDivider} />
            <div className={styles.mobileSectionTitle}>Quick Tools</div>
            <div className={styles.mobileToolsGrid}>
              {onOpenDuel && (
                <button
                  type="button"
                  className={styles.mobileToolBtn}
                  onClick={() => {
                    onOpenDuel();
                    setMobileMenuOpen(false);
                  }}
                >
                  <Swords size={15} className="text-accent-purple" />
                  <span>1v1 Duel</span>
                  {activeDuelsCount > 0 && (
                    <span className={styles.duelBadge}>{activeDuelsCount}</span>
                  )}
                </button>
              )}
              {onOpenRecap && (
                <button
                  type="button"
                  className={styles.mobileToolBtn}
                  onClick={() => {
                    onOpenRecap();
                    setMobileMenuOpen(false);
                  }}
                >
                  <BarChart3 size={15} className="text-accent-green" />
                  <span>Weekly Recap</span>
                </button>
              )}
              {onOpenShareCard && (
                <button
                  type="button"
                  className={styles.mobileToolBtn}
                  onClick={() => {
                    onOpenShareCard();
                    setMobileMenuOpen(false);
                  }}
                >
                  <Share2 size={15} className="text-accent-orange" />
                  <span>Dev Stat Card</span>
                </button>
              )}
              {onOpenExtensionGuide && (
                <button
                  type="button"
                  className={styles.mobileToolBtn}
                  onClick={() => {
                    onOpenExtensionGuide();
                    setMobileMenuOpen(false);
                  }}
                >
                  <Puzzle size={15} className="text-accent-blue" />
                  <span>Extension</span>
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Navbar;
