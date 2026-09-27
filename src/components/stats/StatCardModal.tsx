'use client';

import React, { useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Share2,
  Download,
  Copy,
  Check,
  Sparkles,
} from 'lucide-react';
import styles from './StatCardModal.module.css';
import { Profile, Streak, Attempt } from '../../data/types';

export interface StatCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: Profile | null;
  streak: Streak | null;
  attempts: readonly Attempt[];
  topBadgeName?: string;
}

export const StatCardModal: React.FC<StatCardModalProps> = ({
  isOpen,
  onClose,
  profile,
  streak,
  attempts,
  topBadgeName = 'Consistency Champion',
}) => {
  const [copied, setCopied] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  // Solves breakdown
  const stats = useMemo(() => {
    let easy = 0;
    let medium = 0;
    let hard = 0;
    let total = 0;

    const countedIds = new Set<string>();

    for (const att of attempts) {
      if (att.status === 'solved' && !countedIds.has(att.problem_id)) {
        countedIds.add(att.problem_id);
        total += 1;
        if (att.problem?.difficulty === 'Easy') easy += 1;
        else if (att.problem?.difficulty === 'Medium') medium += 1;
        else if (att.problem?.difficulty === 'Hard') hard += 1;
      }
    }

    return {
      total,
      easy,
      medium,
      hard,
      streak: streak?.current_streak ?? 0,
      longestStreak: streak?.longest_streak ?? 0,
    };
  }, [attempts, streak]);

  const fullName = profile?.full_name || 'Alex Chen';
  const username = profile?.username || 'alexchen';
  const shareUrl = `https://recurse.dev/u/${username}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleDownloadSvg = () => {
    if (!svgRef.current) return;
    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);
    const downloadLink = document.createElement('a');
    downloadLink.href = svgUrl;
    downloadLink.download = `recurse-stat-card-${username}.svg`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(svgUrl);
  };

  if (!isOpen) return null;

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
          <div className={styles.header}>
            <div className={styles.headerTitleGroup}>
              <div className={styles.subheading}>
                <Share2 size={14} />
                <span>Shareable Profile Asset</span>
              </div>
              <h2 className={styles.title}>Developer Stat Card</h2>
              <span className={styles.subtitle}>
                Export your verified algorithmic stats card for GitHub, LinkedIn, or portfolio embeds.
              </span>
            </div>

            <button
              type="button"
              className={styles.closeButton}
              onClick={onClose}
              aria-label="Close stat card modal"
            >
              <X size={16} />
            </button>
          </div>

          {/* SVG Preview Frame */}
          <div className={styles.svgPreviewContainer}>
            <svg
              ref={svgRef}
              viewBox="0 0 600 340"
              xmlns="http://www.w3.org/2000/svg"
              className={styles.statCardSvg}
            >
              <defs>
                <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#121216" />
                  <stop offset="100%" stopColor="#09090C" />
                </linearGradient>

                <linearGradient id="sheenGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="rgba(255, 255, 255, 0)" />
                  <stop offset="50%" stopColor="rgba(255, 255, 255, 0.25)" />
                  <stop offset="100%" stopColor="rgba(255, 255, 255, 0)" />
                </linearGradient>

                <linearGradient id="purpleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#BF5AF2" />
                  <stop offset="100%" stopColor="#5E5CE6" />
                </linearGradient>

                <filter id="cardShadow" x="-10%" y="-10%" width="120%" height="120%">
                  <feDropShadow dx="0" dy="16" stdDeviation="20" floodColor="#000000" floodOpacity="0.5" />
                </filter>
              </defs>

              <style>{`
                .titleText { font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif; font-weight: 700; fill: #FFFFFF; }
                .handleText { font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif; font-weight: 500; fill: rgba(235, 235, 245, 0.6); }
                .metricNum { font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif; font-weight: 700; fill: #FFFFFF; font-size: 26px; }
                .metricLbl { font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif; font-weight: 600; font-size: 11px; text-transform: uppercase; fill: rgba(235, 235, 245, 0.4); letter-spacing: 0.05em; }
                .brandWordmark { font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif; font-weight: 800; font-size: 14px; letter-spacing: 0.12em; fill: #0A84FF; }
              `}</style>

              {/* Background Card */}
              <rect
                x="4"
                y="4"
                width="592"
                height="332"
                rx="20"
                fill="url(#bgGradient)"
                stroke="rgba(255, 255, 255, 0.12)"
                strokeWidth="1.5"
              />

              {/* Top Sheen */}
              <rect x="20" y="4" width="560" height="1.5" fill="url(#sheenGrad)" />

              {/* Header: Logo and Recurse branding */}
              <g transform="translate(36, 36)">
                {/* Logo Vector Icon */}
                <rect width="28" height="28" rx="8" fill="#0A84FF" fillOpacity="0.18" stroke="#0A84FF" strokeWidth="1" />
                <path
                  d="M9 14 C9 10.5 11.5 8 15 8 C18.5 8 20 10 20 14"
                  stroke="#0A84FF"
                  strokeWidth="2"
                  strokeLinecap="round"
                  fill="none"
                />
                <polyline
                  points="18,11 20,14 17,16"
                  stroke="#0A84FF"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
                <text x="38" y="19" className="brandWordmark">RECURSE</text>
              </g>

              {/* Verified Pill */}
              <g transform="translate(450, 36)">
                <rect width="114" height="26" rx="13" fill="rgba(48, 209, 88, 0.15)" stroke="rgba(48, 209, 88, 0.3)" />
                <circle cx="16" cy="13" r="4" fill="#30D158" />
                <text x="28" y="17" className="titleText" fontSize="11" fill="#30D158">VERIFIED SOLVER</text>
              </g>

              {/* User Identity Row */}
              <g transform="translate(36, 90)">
                {/* Monogram circle */}
                <circle cx="28" cy="28" r="28" fill="url(#purpleGrad)" />
                <text x="28" y="36" className="titleText" fontSize="20" textAnchor="middle">
                  {fullName.charAt(0)}
                </text>

                {/* Name & Handle */}
                <text x="70" y="24" className="titleText" fontSize="20">{fullName}</text>
                <text x="70" y="44" className="handleText" fontSize="13">@{username} · LeetCode Practice</text>
              </g>

              {/* Metrics Grid */}
              <g transform="translate(36, 175)">
                {/* Total Solved Box */}
                <rect width="160" height="96" rx="14" fill="#1C1C1E" stroke="rgba(255, 255, 255, 0.08)" />
                <text x="18" y="32" className="metricLbl">TOTAL SOLVED</text>
                <text x="18" y="66" className="metricNum">{stats.total}</text>
                <g transform="translate(18, 76)">
                  <circle cx="3" cy="6" r="3" fill="#30D158" />
                  <text x="10" y="10" className="handleText" fontSize="10">{stats.easy}E</text>
                  <circle cx="38" cy="6" r="3" fill="#FF9F0A" />
                  <text x="45" y="10" className="handleText" fontSize="10">{stats.medium}M</text>
                  <circle cx="73" cy="6" r="3" fill="#FF453A" />
                  <text x="80" y="10" className="handleText" fontSize="10">{stats.hard}H</text>
                </g>

                {/* Active Streak Box */}
                <g transform="translate(184, 0)">
                  <rect width="160" height="96" rx="14" fill="#1C1C1E" stroke="rgba(255, 255, 255, 0.08)" />
                  <text x="18" y="32" className="metricLbl">CONSISTENCY STREAK</text>
                  <text x="18" y="66" className="metricNum">{stats.streak} Days</text>
                  <text x="18" y="86" className="handleText" fontSize="11">Best: {stats.longestStreak} days</text>
                </g>

                {/* Top Badge Milestone */}
                <g transform="translate(368, 0)">
                  <rect width="160" height="96" rx="14" fill="#1C1C1E" stroke="rgba(255, 255, 255, 0.08)" />
                  <text x="18" y="32" className="metricLbl">TOP MILESTONE</text>
                  <text x="18" y="62" className="titleText" fontSize="14" fill="#FF9F0A">{topBadgeName}</text>
                  <text x="18" y="82" className="handleText" fontSize="11">Earned on Recurse</text>
                </g>
              </g>

              {/* Footer Watermark */}
              <text x="36" y="310" className="handleText" fontSize="10">
                Generated via Recurse · Open-source Apple HIG LeetCode Tracking
              </text>
            </svg>
          </div>

          {/* Actions Row */}
          <div className={styles.actionsRow}>
            <div className={styles.shareUrlGroup}>
              <span>{shareUrl}</span>
            </div>

            <div className={styles.buttonGroup}>
              <button
                type="button"
                className={styles.copyBtn}
                onClick={handleCopyLink}
              >
                {copied ? <Check size={14} className="text-accent-green" /> : <Copy size={14} />}
                <span>{copied ? 'Link Copied!' : 'Copy Share Link'}</span>
              </button>

              <button
                type="button"
                className={styles.downloadBtn}
                onClick={handleDownloadSvg}
              >
                <Download size={14} />
                <span>Download SVG</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default StatCardModal;
