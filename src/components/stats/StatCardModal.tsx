'use client';

import React, { useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Share2, Download, Copy, Check, Loader2 } from 'lucide-react';
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

// Card canvas (SVG user units). Export renders at 2x for crisp PNGs.
const CARD_W = 640;
const CARD_H = 384;
const EXPORT_SCALE = 2;

// Text is drawn with system fonts whose widths vary by OS (SF Pro on macOS is
// narrower than Segoe UI / Arial on Windows), so dynamic strings are truncated
// by character count with generous headroom rather than by measured width.
function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'R';
  const letters = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : parts[0].slice(0, 2);
  return letters.toUpperCase();
}

async function svgToPngBlob(svg: SVGSVGElement): Promise<Blob> {
  const data = new XMLSerializer().serializeToString(svg);
  const url = URL.createObjectURL(new Blob([data], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    const img = new Image();
    img.decoding = 'async';
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Could not render the card image.'));
      img.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = CARD_W * EXPORT_SCALE;
    canvas.height = CARD_H * EXPORT_SCALE;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas is not supported in this browser.');
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not export PNG.'))), 'image/png')
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}

export const StatCardModal: React.FC<StatCardModalProps> = ({
  isOpen,
  onClose,
  profile,
  streak,
  attempts,
  topBadgeName,
}) => {
  const [copyState, setCopyState] = useState<'idle' | 'working' | 'done'>('idle');
  const [downloading, setDownloading] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Unique solved problems by difficulty
  const stats = useMemo(() => {
    const seen = new Set<string>();
    let easy = 0;
    let medium = 0;
    let hard = 0;
    for (const att of attempts) {
      if (att.status !== 'solved' || seen.has(att.problem_id)) continue;
      seen.add(att.problem_id);
      const d = att.problem?.difficulty;
      if (d === 'Easy') easy += 1;
      else if (d === 'Hard') hard += 1;
      else medium += 1;
    }
    return {
      total: seen.size,
      easy,
      medium,
      hard,
      streak: streak?.current_streak ?? 0,
      longestStreak: Math.max(streak?.longest_streak ?? 0, streak?.current_streak ?? 0),
    };
  }, [attempts, streak]);

  const fullName = truncate(profile?.full_name || profile?.username || 'Recurse User', 26);
  const username = truncate(profile?.username || 'user', 24);
  const monthLabel = new Date()
    .toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    .toUpperCase();

  // Difficulty bar segments (x offset + width within a 256-unit track)
  const BAR_W = 256;
  const segments = useMemo(() => {
    if (stats.total === 0) return [];
    let x = 0;
    return [
      { key: 'easy', count: stats.easy, color: '#30D158' },
      { key: 'medium', count: stats.medium, color: '#FF9F0A' },
      { key: 'hard', count: stats.hard, color: '#FF453A' },
    ]
      .filter((s) => s.count > 0)
      .map((s) => {
        const w = (s.count / stats.total) * BAR_W;
        const seg = { ...s, x, w };
        x += w;
        return seg;
      });
  }, [stats]);

  const handleCopyImage = async () => {
    if (!svgRef.current) return;
    setExportError(null);
    setCopyState('working');
    try {
      if (!('ClipboardItem' in window) || !navigator.clipboard?.write) {
        throw new Error('Copying images is not supported in this browser. Use Download PNG instead.');
      }
      // Pass a promise so Safari keeps the user-gesture context.
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': svgToPngBlob(svgRef.current) }),
      ]);
      setCopyState('done');
      setTimeout(() => setCopyState('idle'), 2000);
    } catch (err: unknown) {
      setCopyState('idle');
      setExportError(err instanceof Error ? err.message : 'Could not copy the image.');
    }
  };

  const handleDownloadPng = async () => {
    if (!svgRef.current) return;
    setExportError(null);
    setDownloading(true);
    try {
      const blob = await svgToPngBlob(svgRef.current);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `recurse-${profile?.username || 'stats'}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err: unknown) {
      setExportError(err instanceof Error ? err.message : 'Could not export the image.');
    } finally {
      setDownloading(false);
    }
  };

  if (!isOpen) return null;

  const font = `-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif`;

  return (
    <AnimatePresence>
      <div className={styles.overlay} onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="stat-card-title">
        <motion.div
          className={styles.modalCard}
          onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          transition={{ type: 'spring', stiffness: 450, damping: 30 }}
        >
          <div className={styles.sheenTop} />

          <div className={styles.header}>
            <div className={styles.headerTitleGroup}>
              <div className={styles.subheading}>
                <Share2 size={14} />
                <span>Share Your Progress</span>
              </div>
              <h2 className={styles.title} id="stat-card-title">Stat Card</h2>
              <span className={styles.subtitle}>
                A snapshot of your practice for GitHub, LinkedIn, or your portfolio.
              </span>
            </div>

            <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Close stat card">
              <X size={16} />
            </button>
          </div>

          <div className={styles.svgPreviewContainer}>
            <svg
              ref={svgRef}
              viewBox={`0 0 ${CARD_W} ${CARD_H}`}
              width={CARD_W}
              height={CARD_H}
              xmlns="http://www.w3.org/2000/svg"
              className={styles.statCardSvg}
              role="img"
              aria-label={`${fullName}: ${stats.total} problems solved, ${stats.streak} day streak`}
              fontFamily={font}
            >
              <defs>
                <linearGradient id="rc-bg" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#17171B" />
                  <stop offset="1" stopColor="#0B0B0E" />
                </linearGradient>
                <radialGradient id="rc-glow-blue" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(90 40) scale(300 220)">
                  <stop offset="0" stopColor="#0A84FF" stopOpacity="0.28" />
                  <stop offset="1" stopColor="#0A84FF" stopOpacity="0" />
                </radialGradient>
                <radialGradient id="rc-glow-purple" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(600 360) scale(320 240)">
                  <stop offset="0" stopColor="#BF5AF2" stopOpacity="0.2" />
                  <stop offset="1" stopColor="#BF5AF2" stopOpacity="0" />
                </radialGradient>
                <linearGradient id="rc-avatar" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#0A84FF" />
                  <stop offset="1" stopColor="#5E5CE6" />
                </linearGradient>
                <linearGradient id="rc-tile" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0" stopColor="#0B0B0E" />
                  <stop offset="1" stopColor="#141416" />
                </linearGradient>
                <linearGradient id="rc-sheen" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0" stopColor="#FFFFFF" stopOpacity="0" />
                  <stop offset="0.5" stopColor="#FFFFFF" stopOpacity="0.28" />
                  <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
                </linearGradient>
                <clipPath id="rc-card">
                  <rect width={CARD_W} height={CARD_H} rx="24" />
                </clipPath>
                <clipPath id="rc-bar">
                  <rect x="0" y="0" width={BAR_W} height="8" rx="4" />
                </clipPath>
              </defs>

              {/* Card surface */}
              <g clipPath="url(#rc-card)">
                <rect width={CARD_W} height={CARD_H} fill="url(#rc-bg)" />
                <rect width={CARD_W} height={CARD_H} fill="url(#rc-glow-blue)" />
                <rect width={CARD_W} height={CARD_H} fill="url(#rc-glow-purple)" />
                <rect x="40" y="0" width={CARD_W - 80} height="1" fill="url(#rc-sheen)" />
              </g>
              <rect x="0.5" y="0.5" width={CARD_W - 1} height={CARD_H - 1} rx="23.5" fill="none" stroke="#FFFFFF" strokeOpacity="0.1" />

              {/* Brand: Recurse logomark + wordmark */}
              <g transform="translate(32 28)">
                <rect width="30" height="30" rx="8" fill="url(#rc-tile)" stroke="#FFFFFF" strokeOpacity="0.14" />
                <path
                  d="M 7.5 22 L 7.5 7.5 L 22.5 7.5 L 22.5 18 L 12.5 18 L 12.5 12.5 L 17.5 12.5"
                  fill="none"
                  stroke="#0A84FF"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <text x="42" y="21" fontSize="17" fontWeight="600" fill="#FFFFFF" letterSpacing="-0.3">
                  Recurse
                </text>
              </g>

              {/* Period pill */}
              <g transform={`translate(${CARD_W - 32 - 150} 30)`}>
                <rect width="150" height="26" rx="13" fill="#FFFFFF" fillOpacity="0.06" stroke="#FFFFFF" strokeOpacity="0.1" />
                <text x="75" y="17.5" textAnchor="middle" fontSize="10.5" fontWeight="600" fill="#EBEBF5" fillOpacity="0.6" letterSpacing="0.8">
                  {monthLabel}
                </text>
              </g>

              {/* Identity */}
              <g transform="translate(32 84)">
                <circle cx="26" cy="26" r="26" fill="url(#rc-avatar)" />
                <text x="26" y="33" textAnchor="middle" fontSize="18" fontWeight="600" fill="#FFFFFF">
                  {initialsFor(profile?.full_name || profile?.username || 'R')}
                </text>
                <text x="68" y="22" fontSize="21" fontWeight="700" fill="#FFFFFF" letterSpacing="-0.4">
                  {fullName}
                </text>
                <text x="68" y="43" fontSize="13" fontWeight="500" fill="#EBEBF5" fillOpacity="0.6">
                  @{username}
                </text>
              </g>

              {/* Hero: problems solved */}
              <g transform="translate(32 160)">
                <rect width="296" height="176" rx="18" fill="#FFFFFF" fillOpacity="0.045" stroke="#FFFFFF" strokeOpacity="0.09" />
                <text x="20" y="32" fontSize="10.5" fontWeight="600" fill="#EBEBF5" fillOpacity="0.45" letterSpacing="0.9">
                  PROBLEMS SOLVED
                </text>
                <text x="18" y="94" fontSize="56" fontWeight="700" fill="#FFFFFF" letterSpacing="-2">
                  {stats.total}
                </text>

                {/* Difficulty breakdown bar */}
                <g transform="translate(20 116)">
                  <rect width={BAR_W} height="8" rx="4" fill="#FFFFFF" fillOpacity="0.08" />
                  <g clipPath="url(#rc-bar)">
                    {segments.map((s) => (
                      <rect key={s.key} x={s.x} width={s.w} height="8" fill={s.color} />
                    ))}
                  </g>
                </g>

                {/* Legend */}
                <g transform="translate(20 150)" fontSize="12" fontWeight="500">
                  <circle cx="4" cy="-4" r="4" fill="#30D158" />
                  <text x="14" y="0" fill="#EBEBF5" fillOpacity="0.72">{stats.easy} Easy</text>
                  <circle cx="92" cy="-4" r="4" fill="#FF9F0A" />
                  <text x="102" y="0" fill="#EBEBF5" fillOpacity="0.72">{stats.medium} Medium</text>
                  <circle cx="196" cy="-4" r="4" fill="#FF453A" />
                  <text x="206" y="0" fill="#EBEBF5" fillOpacity="0.72">{stats.hard} Hard</text>
                </g>
              </g>

              {/* Streak tile */}
              <g transform="translate(344 160)">
                <rect width="264" height="80" rx="18" fill="#FFFFFF" fillOpacity="0.045" stroke="#FFFFFF" strokeOpacity="0.09" />
                <text x="20" y="30" fontSize="10.5" fontWeight="600" fill="#EBEBF5" fillOpacity="0.45" letterSpacing="0.9">
                  CURRENT STREAK
                </text>
                <text x="20" y="62" fontSize="26" fontWeight="700" fill="#FFFFFF" letterSpacing="-0.6">
                  {stats.streak}
                  <tspan fontSize="15" fontWeight="600" fill="#FF9F0A" dx="6">
                    {stats.streak === 1 ? 'day' : 'days'}
                  </tspan>
                </text>
                <text x="244" y="62" textAnchor="end" fontSize="12" fontWeight="500" fill="#EBEBF5" fillOpacity="0.55">
                  Best {stats.longestStreak}
                </text>
              </g>

              {/* Top badge tile */}
              <g transform="translate(344 256)">
                <rect width="264" height="80" rx="18" fill="#FFFFFF" fillOpacity="0.045" stroke="#FFFFFF" strokeOpacity="0.09" />
                <text x="20" y="30" fontSize="10.5" fontWeight="600" fill="#EBEBF5" fillOpacity="0.45" letterSpacing="0.9">
                  TOP BADGE
                </text>
                {topBadgeName ? (
                  <text x="20" y="60" fontSize="17" fontWeight="700" fill="#BF5AF2" letterSpacing="-0.3">
                    {truncate(topBadgeName, 22)}
                  </text>
                ) : (
                  <text x="20" y="60" fontSize="14" fontWeight="500" fill="#EBEBF5" fillOpacity="0.5">
                    First badge in progress
                  </text>
                )}
              </g>

              {/* Footer */}
              <text x="32" y="364" fontSize="11" fontWeight="500" fill="#EBEBF5" fillOpacity="0.38">
                Tracked with Recurse
              </text>
              <text x={CARD_W - 32} y="364" textAnchor="end" fontSize="11" fontWeight="500" fill="#EBEBF5" fillOpacity="0.38">
                recurse.talibibrahim04.workers.dev
              </text>
            </svg>
          </div>

          {exportError && (
            <p className={styles.errorText} role="alert">
              {exportError}
            </p>
          )}

          <div className={styles.actionsRow}>
            <span className={styles.hint}>PNG, 1280 × 768</span>

            <div className={styles.buttonGroup}>
              <button
                type="button"
                className={styles.copyBtn}
                onClick={handleCopyImage}
                disabled={copyState === 'working'}
              >
                {copyState === 'done' ? (
                  <Check size={14} className="text-accent-green" />
                ) : copyState === 'working' ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Copy size={14} />
                )}
                <span>{copyState === 'done' ? 'Copied' : 'Copy Image'}</span>
              </button>

              <button
                type="button"
                className={styles.downloadBtn}
                onClick={handleDownloadPng}
                disabled={downloading}
              >
                {downloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                <span>Download PNG</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default StatCardModal;
