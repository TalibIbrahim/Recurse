'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Code,
  Flame,
  Calendar,
  BookOpen,
  Users,
  Trophy,
  BarChart3,
  ChevronDown,
  LogOut,
  User,
  Check,
  Menu,
  X,
  Sparkles,
  Swords,
  Share2,
  Puzzle,
} from 'lucide-react';
import styles from './Navbar.module.css';
import { Profile } from '../../data/types';
import { demoStore, DEMO_USER_ID, FRIEND_SARAH_ID, STRANGER_MARCUS_ID } from '../../lib/supabase';
import { RecurseLogo } from '../ui/RecurseLogo';

export type NavTabId = 'today' | 'problems' | 'friends' | 'leaderboard' | 'activity';

export interface NavbarProps {
  activeTab: NavTabId;
  onTabChange: (tab: NavTabId) => void;
  streakCount: number;
  currentProfile: Profile | null;
  isDemo: boolean;
  onOpenAuthModal: () => void;
  onSignOut: () => void;
  onOpenRecap?: () => void;
  onOpenDuel?: () => void;
  onOpenShareCard?: () => void;
  onOpenExtensionGuide?: () => void;
  activeDuelsCount?: number;
}

interface DemoUserOption {
  id: string;
  name: string;
  role: string;
  avatar: string;
}

const DEMO_OPTIONS: readonly DemoUserOption[] = [
  {
    id: DEMO_USER_ID,
    name: 'Alex Chen',
    role: 'Consistent Grinder · 14d streak',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
  },
  {
    id: FRIEND_SARAH_ID,
    name: 'Sarah Lin',
    role: 'DP Specialist · 18d streak',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
  },
  {
    id: STRANGER_MARCUS_ID,
    name: 'Marcus Vance',
    role: 'Weekend Warrior · Blind 75',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
  },
];

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  streakCount,
  currentProfile,
  isDemo,
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

  const handleSelectDemoUser = (userId: string) => {
    demoStore.setCurrentUserId(userId);
    setDropdownOpen(false);
  };

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

        {/* Action Group */}
        <div className={styles.actionGroup}>
          {/* Quick Feature Action Buttons: Recap, Duel, Share, Extension */}
          {onOpenRecap && (
            <button
              type="button"
              className={styles.headerActionBtn}
              onClick={onOpenRecap}
              title="Open Weekly Performance Recap"
            >
              <Sparkles size={14} className="text-accent-blue" />
              <span>Recap</span>
            </button>
          )}

          {onOpenDuel && (
            <button
              type="button"
              className={styles.headerActionBtn}
              onClick={onOpenDuel}
              title="1v1 Problem Duels"
            >
              <Swords size={14} className="text-accent-orange" />
              <span>Duel</span>
              {activeDuelsCount > 0 && (
                <span className={styles.duelBadge}>{activeDuelsCount}</span>
              )}
            </button>
          )}

          {onOpenShareCard && (
            <button
              type="button"
              className={styles.headerActionBtn}
              onClick={onOpenShareCard}
              title="Export Dev Stat Card"
            >
              <Share2 size={14} className="text-accent-purple" />
              <span>Share Card</span>
            </button>
          )}

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

          {/* Quick Demo Switcher / User Profile Dropdown */}
          <div className={styles.userSwitcherWrapper} ref={dropdownRef}>
            <button
              type="button"
              className={styles.switcherTrigger}
              onClick={() => setDropdownOpen((prev) => !prev)}
              aria-expanded={dropdownOpen}
              aria-label="User account and persona selector"
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
                  {currentProfile?.full_name?.split(' ')[0] || 'Demo'}
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
                  <div className={styles.dropdownHeader}>Switch Persona (Live Demo)</div>

                  {DEMO_OPTIONS.map((demo) => {
                    const isSelected = currentProfile?.id === demo.id;
                    return (
                      <button
                        key={demo.id}
                        type="button"
                        className={`${styles.dropdownItem} ${
                          isSelected ? styles.dropdownItemActive : ''
                        }`}
                        onClick={() => handleSelectDemoUser(demo.id)}
                      >
                        <div className={styles.userInfoRow}>
                          <img src={demo.avatar} alt={demo.name} className={styles.avatarSmall} />
                          <div className={styles.userMeta}>
                            <span className={styles.userNameLabel}>{demo.name}</span>
                            <span className={styles.userHandleLabel}>{demo.role}</span>
                          </div>
                        </div>
                        {isSelected && <Check size={16} />}
                      </button>
                    );
                  })}

                  <div className={styles.divider} />

                  {currentProfile ? (
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
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Navbar;
