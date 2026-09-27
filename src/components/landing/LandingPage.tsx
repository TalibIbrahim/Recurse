'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  Target,
  Flame,
  Users,
  Swords,
  BookOpen,
  Laptop,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Play,
  ShieldCheck,
} from 'lucide-react';
import styles from './LandingPage.module.css';
import { SquaresBackground } from '../ui/SquaresBackground';
import { RecurseLogo } from '../ui/RecurseLogo';

export interface LandingPageProps {
  onOpenAuth: (mode: 'signin' | 'signup') => void;
  onExploreDemo: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onOpenAuth,
  onExploreDemo,
}) => {
  return (
    <div className={styles.container}>
      {/* ReactBits-style Canvas Geometric Grid Background */}
      <div className={styles.canvasWrapper} aria-hidden="true">
        <SquaresBackground
          direction="diagonal"
          speed={0.4}
          squareSize={44}
          borderColor="rgba(255, 255, 255, 0.05)"
          hoverFillColor="rgba(10, 132, 255, 0.09)"
        />
      </div>

      <div className={styles.contentLayer}>
        {/* Navigation Bar */}
        <header className={styles.navHeader}>
          <RecurseLogo size={24} showWordmark={true} />

          <div className={styles.navActions}>
            <button
              type="button"
              className={styles.navDemoBtn}
              onClick={onExploreDemo}
              title="Explore the application in an instant sandbox"
            >
              <Sparkles size={14} className="text-[#0A84FF]" />
              <span>Demo Sandbox</span>
            </button>

            <button
              type="button"
              className={styles.navSignInBtn}
              onClick={() => onOpenAuth('signin')}
            >
              Sign In
            </button>

            <button
              type="button"
              className={styles.navCtaBtn}
              onClick={() => onOpenAuth('signup')}
            >
              <span>Get Started</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </header>

        {/* Hero Section */}
        <section className={styles.hero}>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className={styles.pillBadge}>
              <ShieldCheck size={14} />
              <span>Algorithmic Practice & Peer Accountability</span>
            </div>

            <h1 className={styles.headline}>
              Master technical interviews through{' '}
              <span className={styles.headlineGradient}>
                consistent daily practice
              </span>
              .
            </h1>

            <p className={styles.subtitle}>
              Recurse pairs Apple Fitness-inspired daily practice rings with
              social loss-aversion mechanics, curated patterns (Blind 75 & NeetCode 150),
              real-time 1v1 duels, and zero raw code sharing.
            </p>

            <div className={styles.heroCtas}>
              <button
                type="button"
                className={styles.primaryCta}
                onClick={() => onOpenAuth('signup')}
              >
                <span>Start Practicing</span>
                <ArrowRight size={16} />
              </button>

              <button
                type="button"
                className={styles.secondaryCta}
                onClick={onExploreDemo}
              >
                <Play size={15} className="text-[#0A84FF]" />
                <span>Explore Demo Sandbox</span>
              </button>
            </div>

            <div className={styles.trustPoints}>
              <div className={styles.trustItem}>
                <CheckCircle2 size={15} className={styles.trustIcon} />
                <span>Zero raw code sharing</span>
              </div>
              <div className={styles.trustItem}>
                <CheckCircle2 size={15} className={styles.trustIcon} />
                <span>Curated Blind 75 & NeetCode 150</span>
              </div>
              <div className={styles.trustItem}>
                <CheckCircle2 size={15} className={styles.trustIcon} />
                <span>Realtime 1v1 Duels</span>
              </div>
              <div className={styles.trustItem}>
                <CheckCircle2 size={15} className={styles.trustIcon} />
                <span>Automatic Extension Sync</span>
              </div>
            </div>
          </motion.div>
        </section>

        {/* Teaser Preview Card */}
        <div className={styles.previewWrapper}>
          <div className={styles.previewCard}>
            <div className={styles.previewHeader}>
              <div className={styles.windowDots}>
                <span className={styles.dot} />
                <span className={styles.dot} />
                <span className={styles.dot} />
              </div>
              <div className={styles.previewTitleBar}>
                recurse.app / dashboard / today
              </div>
              <div className="flex items-center gap-2 text-xs text-[#30D158] font-medium">
                <span className="w-2 h-2 rounded-full bg-[#30D158] animate-pulse" />
                <span>Live Pod</span>
              </div>
            </div>

            <div className={styles.previewContent}>
              {/* Daily Rings Card */}
              <div className={styles.previewRingsCard}>
                <svg
                  className={styles.previewRingSvg}
                  viewBox="0 0 100 100"
                  aria-label="Concentric practice rings"
                >
                  {/* Outer Ring: Hard (Red) */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="rgba(255, 69, 58, 0.15)"
                    strokeWidth="8"
                    fill="none"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="#FF453A"
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray="251.2"
                    strokeDashoffset="125.6"
                    strokeLinecap="round"
                    transform="rotate(-90 50 50)"
                  />
                  {/* Middle Ring: Medium (Amber) */}
                  <circle
                    cx="50"
                    cy="50"
                    r="30"
                    stroke="rgba(255, 159, 10, 0.15)"
                    strokeWidth="8"
                    fill="none"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="30"
                    stroke="#FF9F0A"
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray="188.4"
                    strokeDashoffset="47.1"
                    strokeLinecap="round"
                    transform="rotate(-90 50 50)"
                  />
                  {/* Inner Ring: Easy (Green) */}
                  <circle
                    cx="50"
                    cy="50"
                    r="20"
                    stroke="rgba(48, 209, 88, 0.15)"
                    strokeWidth="8"
                    fill="none"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="20"
                    stroke="#30D158"
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray="125.6"
                    strokeDashoffset="0"
                    strokeLinecap="round"
                    transform="rotate(-90 50 50)"
                  />
                </svg>

                <div className={styles.ringStats}>
                  <div className={styles.ringStatRow}>
                    <span
                      className={styles.statDot}
                      style={{ background: '#30D158' }}
                    />
                    <span className={styles.statLabel}>Easy</span>
                    <span className={styles.statValue}>1 / 1 Solved</span>
                  </div>
                  <div className={styles.ringStatRow}>
                    <span
                      className={styles.statDot}
                      style={{ background: '#FF9F0A' }}
                    />
                    <span className={styles.statLabel}>Medium</span>
                    <span className={styles.statValue}>2 / 2 Solved</span>
                  </div>
                  <div className={styles.ringStatRow}>
                    <span
                      className={styles.statDot}
                      style={{ background: '#FF453A' }}
                    />
                    <span className={styles.statLabel}>Hard</span>
                    <span className={styles.statValue}>0 / 1 Target</span>
                  </div>
                </div>
              </div>

              {/* Peer Activity Feed Teaser */}
              <div className={styles.previewFeedCard}>
                <div className={styles.feedHeader}>Peer Pod Activity</div>
                <div className={styles.feedItem}>
                  <div className={styles.feedUser}>
                    <span className={styles.feedAvatar}>SL</span>
                    <span>Sarah Lin</span>
                  </div>
                  <span className={styles.feedProblem}>Coin Change (DP)</span>
                </div>
                <div className={styles.feedItem}>
                  <div className={styles.feedUser}>
                    <span className={styles.feedAvatar}>DK</span>
                    <span>David Kim</span>
                  </div>
                  <span className={styles.feedProblem}>Course Schedule II</span>
                </div>
                <div className={styles.feedItem}>
                  <div className={styles.feedUser}>
                    <span className={styles.feedAvatar}>EV</span>
                    <span>Elena Vance</span>
                  </div>
                  <span className={styles.feedProblem}>Trapping Rain Water</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Showcase Grid */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionBadge}>Engineered for Focus</div>
            <h2 className={styles.sectionTitle}>
              Everything you need for sustainable consistency.
            </h2>
            <p className={styles.sectionSubtitle}>
              Built on behavioral psychology: closing rings, preserving streaks,
              and peer commitment without the toxicity of public leaderboards.
            </p>
          </div>

          <div className={styles.featureGrid}>
            {/* Feature 1 */}
            <div className={styles.featureCard}>
              <div className={styles.featureIconWrapper}>
                <Target size={22} />
              </div>
              <h3 className={styles.featureTitle}>Concentric Practice Rings</h3>
              <p className={styles.featureDescription}>
                Apple Fitness-inspired concentric rings for Easy, Medium, and Hard
                tiers. Set daily or weekly targets calibrated to your interview timeline.
              </p>
            </div>

            {/* Feature 2 */}
            <div className={styles.featureCard}>
              <div className={styles.featureIconWrapper}>
                <Flame size={22} className="text-[#FF9F0A]" />
              </div>
              <h3 className={styles.featureTitle}>Streak Integrity & Heatmaps</h3>
              <p className={styles.featureDescription}>
                Visual 52-week calendar heatmaps, streak freezes to protect against
                travel days, and progressive milestone badges that reward continuous discipline.
              </p>
            </div>

            {/* Feature 3 */}
            <div className={styles.featureCard}>
              <div className={styles.featureIconWrapper}>
                <Users size={22} className="text-[#30D158]" />
              </div>
              <h3 className={styles.featureTitle}>Private Peer Pods</h3>
              <p className={styles.featureDescription}>
                Form accountability circles with colleagues or friends. View live solves,
                exchange discreet nudges, and share conceptual approach notes without spoilers.
              </p>
            </div>

            {/* Feature 4 */}
            <div className={styles.featureCard}>
              <div className={styles.featureIconWrapper}>
                <Swords size={22} className="text-[#BF5AF2]" />
              </div>
              <h3 className={styles.featureTitle}>1v1 Algorithmic Duels</h3>
              <p className={styles.featureDescription}>
                Challenge friends to 15, 30, or 45-minute timed algorithmic duels.
                Experience real interview time pressure in a supportive, gamified format.
              </p>
            </div>

            {/* Feature 5 */}
            <div className={styles.featureCard}>
              <div className={styles.featureIconWrapper}>
                <BookOpen size={22} className="text-[#0A84FF]" />
              </div>
              <h3 className={styles.featureTitle}>Curated Pattern Roadmaps</h3>
              <p className={styles.featureDescription}>
                Filter curated collections including Blind 75, NeetCode 150, and Grind 75,
                or target company tags for Google, Meta, Apple, and Amazon.
              </p>
            </div>

            {/* Feature 6 */}
            <div className={styles.featureCard}>
              <div className={styles.featureIconWrapper}>
                <Laptop size={22} className="text-[#64D2FF]" />
              </div>
              <h3 className={styles.featureTitle}>Browser Extension Sync</h3>
              <p className={styles.featureDescription}>
                Companion Manifest V3 extension for Chrome and Edge that automatically
                detects and syncs verified LeetCode solves with zero manual logging required.
              </p>
            </div>
          </div>
        </section>

        {/* Bottom CTA Banner */}
        <section className={styles.ctaBanner}>
          <h2 className={styles.ctaHeadline}>
            Ready to upgrade your algorithmic discipline?
          </h2>
          <p className={styles.ctaSubtitle}>
            Join software engineers maintaining consistent interview readiness.
            Explore the sandbox first or create your personal account in seconds.
          </p>
          <div className={styles.heroCtas} style={{ marginBottom: 0 }}>
            <button
              type="button"
              className={styles.primaryCta}
              onClick={() => onOpenAuth('signup')}
            >
              <span>Create Free Account</span>
              <ArrowRight size={16} />
            </button>
            <button
              type="button"
              className={styles.secondaryCta}
              onClick={onExploreDemo}
            >
              <Play size={15} className="text-[#0A84FF]" />
              <span>Explore Demo Sandbox</span>
            </button>
          </div>
        </section>

        {/* Footer */}
        <footer className={styles.footer}>
          <div className={styles.footerLeft}>
            <RecurseLogo size={18} showWordmark={true} />
            <span>Algorithmic Practice & Peer Accountability</span>
          </div>

          <div className={styles.footerLinks}>
            <button
              type="button"
              className={styles.footerLink}
              onClick={onExploreDemo}
            >
              Demo Sandbox
            </button>
            <button
              type="button"
              className={styles.footerLink}
              onClick={() => onOpenAuth('signin')}
            >
              Sign In
            </button>
            <button
              type="button"
              className={styles.footerLink}
              onClick={() => onOpenAuth('signup')}
            >
              Register
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default LandingPage;
