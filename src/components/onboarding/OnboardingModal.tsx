'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import {
  Target,
  Shield,
  Swords,
  BookOpen,
  ArrowRight,
  Check,
  Sparkles,
  Zap,
  Calendar,
} from 'lucide-react';
import styles from './OnboardingModal.module.css';
import { Profile, GoalCadence } from '../../data/types';

export interface OnboardingData {
  fullName: string;
  leetcodeUsername: string;
  persona: string;
  cadence: GoalCadence;
  weeklyTarget: number;
}

export interface OnboardingModalProps {
  isOpen: boolean;
  onComplete: (data: OnboardingData) => Promise<void>;
  userProfile?: Profile | null;
}

const PERSONA_OPTIONS = [
  {
    title: 'Consistent Grinder',
    description: 'Disciplined daily problem-solving habit',
    icon: 'flame',
  },
  {
    title: 'DP Specialist',
    description: 'Mastering dynamic programming state transitions',
    icon: 'zap',
  },
  {
    title: 'Speed Demon',
    description: 'Optimizing runtime benchmarks and space limits',
    icon: 'target',
  },
  {
    title: 'Weekend Warrior',
    description: 'High-yield weekend sprints and mock contests',
    icon: 'calendar',
  },
];

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  onComplete,
  userProfile,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [fullName, setFullName] = useState(userProfile?.full_name || '');
  const [leetcodeUsername, setLeetcodeUsername] = useState(userProfile?.leetcode_username || '');
  const [selectedPersona, setSelectedPersona] = useState(userProfile?.identity_label?.title || 'Consistent Grinder');
  const [cadence, setCadence] = useState<GoalCadence>('both');
  const [weeklyTarget, setWeeklyTarget] = useState(10);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleNext = async () => {
    if (step === 1) {
      setStep(2);
    } else if (step === 2) {
      setStep(3);
    } else {
      setIsSubmitting(true);
      try {
        confetti({
          particleCount: 100,
          spread: 80,
          origin: { y: 0.55 },
          colors: ['#30D158', '#0A84FF', '#FF9F0A', '#BF5AF2'],
        });

        await onComplete({
          fullName: fullName.trim() || userProfile?.full_name || 'Engineer',
          leetcodeUsername: leetcodeUsername.trim(),
          persona: selectedPersona,
          cadence,
          weeklyTarget,
        });
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <AnimatePresence>
      <div className={styles.overlay} role="dialog" aria-modal="true">
        <motion.div
          className={styles.modalCard}
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          transition={{ type: 'spring', stiffness: 450, damping: 32 }}
        >
          <div className={styles.sheenTop} />

          {/* Stepper progress indicator */}
          <div className={styles.stepIndicator}>
            <div
              className={`${styles.stepBar} ${
                step >= 1 ? (step > 1 ? styles.stepBarCompleted : styles.stepBarActive) : ''
              }`}
            />
            <div
              className={`${styles.stepBar} ${
                step >= 2 ? (step > 2 ? styles.stepBarCompleted : styles.stepBarActive) : ''
              }`}
            />
            <div className={`${styles.stepBar} ${step === 3 ? styles.stepBarActive : ''}`} />
          </div>

          {/* STEP 1: Profile & Persona */}
          {step === 1 && (
            <motion.div
              key="step-1"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.2 }}
            >
              <div className={styles.modalHeader}>
                <span className={styles.badgeHeader}>
                  <Sparkles size={13} />
                  <span>Step 1 of 3</span>
                </span>
                <h2 className={styles.title}>Define Your Practice Identity</h2>
                <p className={styles.subtitle}>
                  Personalize your profile so your peers can track your momentum and challenge you to duels.
                </p>
              </div>

              <div className={styles.formSection}>
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Full Name or Display Handle</label>
                  <input
                    type="text"
                    className={styles.input}
                    placeholder="e.g. Alex Chen"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.label}>LeetCode Username (Optional)</label>
                  <input
                    type="text"
                    className={styles.input}
                    placeholder="e.g. alexchen_dev"
                    value={leetcodeUsername}
                    onChange={(e) => setLeetcodeUsername(e.target.value)}
                  />
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Choose Your Practice Persona</label>
                  <div className={styles.personaGrid}>
                    {PERSONA_OPTIONS.map((p) => {
                      const isSelected = selectedPersona === p.title;
                      return (
                        <button
                          key={p.title}
                          type="button"
                          className={`${styles.personaCard} ${
                            isSelected ? styles.personaActive : ''
                          }`}
                          onClick={() => setSelectedPersona(p.title)}
                        >
                          <span className={styles.personaTitle}>{p.title}</span>
                          <span className={styles.personaDesc}>{p.description}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 2: Practice Cadence */}
          {step === 2 && (
            <motion.div
              key="step-2"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.2 }}
            >
              <div className={styles.modalHeader}>
                <span className={styles.badgeHeader}>
                  <Target size={13} />
                  <span>Step 2 of 3</span>
                </span>
                <h2 className={styles.title}>Choose Your Practice Rhythm</h2>
                <p className={styles.subtitle}>
                  Recurse supports dual cadences so you can maintain a small daily habit while hitting a flexible weekly stretch target.
                </p>
              </div>

              <div className={styles.formSection}>
                <div className={styles.personaGrid} style={{ gridTemplateColumns: '1fr' }}>
                  <button
                    type="button"
                    className={`${styles.personaCard} ${
                      cadence === 'both' ? styles.personaActive : ''
                    }`}
                    onClick={() => setCadence('both')}
                  >
                    <div className="flex items-center justify-between">
                      <span className={styles.personaTitle}>Dual Cadence (Recommended)</span>
                      <span className="text-xs font-semibold text-accent-blue bg-blue-500/10 px-2 py-0.5 rounded-full">
                        Daily + Weekly
                      </span>
                    </div>
                    <span className={styles.personaDesc}>
                      1 Easy and 1 Medium daily habit rings, plus a 10 problem/week stretch goal. Builds momentum with +1 bonus credit from streaks.
                    </span>
                  </button>

                  <button
                    type="button"
                    className={`${styles.personaCard} ${
                      cadence === 'daily' ? styles.personaActive : ''
                    }`}
                    onClick={() => setCadence('daily')}
                  >
                    <span className={styles.personaTitle}>Daily Habit Rings Only</span>
                    <span className={styles.personaDesc}>
                      Paced strictly day by day. Close your concentric rings before midnight to keep your consistency streak alive.
                    </span>
                  </button>

                  <button
                    type="button"
                    className={`${styles.personaCard} ${
                      cadence === 'weekly' ? styles.personaActive : ''
                    }`}
                    onClick={() => setCadence('weekly')}
                  >
                    <span className={styles.personaTitle}>Flexible Weekly Stretch Only</span>
                    <span className={styles.personaDesc}>
                      Hit your target count across the week on whatever days fit your engineering schedule.
                    </span>
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 3: Feature Briefing */}
          {step === 3 && (
            <motion.div
              key="step-3"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.2 }}
            >
              <div className={styles.modalHeader}>
                <span className={styles.badgeHeader}>
                  <Zap size={13} />
                  <span>Step 3 of 3</span>
                </span>
                <h2 className={styles.title}>How Recurse Protects Your Focus</h2>
                <p className={styles.subtitle}>
                  Engineered without AI gimmicks or vanity scoreboards. Here are your 4 core mechanics:
                </p>
              </div>

              <div className={styles.featureList}>
                <div className={styles.featureCard}>
                  <div className={styles.featureIconBox}>
                    <Target size={18} />
                  </div>
                  <div className={styles.featureMeta}>
                    <span className={styles.featureTitle}>Practice Rings & Near-Miss Framing</span>
                    <span className={styles.featureDesc}>
                      See explicit remaining countdowns (e.g. &ldquo;1 more to close daily rings&rdquo;) rather than abstract percentages.
                    </span>
                  </div>
                </div>

                <div className={styles.featureCard}>
                  <div className={styles.featureIconBox} style={{ color: '#FF9F0A', background: 'rgba(255, 159, 10, 0.12)', borderColor: 'rgba(255, 159, 10, 0.25)' }}>
                    <Shield size={18} />
                  </div>
                  <div className={styles.featureMeta}>
                    <span className={styles.featureTitle}>2 Auto-Consuming Streak Freezes</span>
                    <span className={styles.featureDesc}>
                      If you miss a day, your streak freeze auto-protects your streak. Amber at-risk alerts trigger before midnight.
                    </span>
                  </div>
                </div>

                <div className={styles.featureCard}>
                  <div className={styles.featureIconBox} style={{ color: '#BF5AF2', background: 'rgba(191, 90, 242, 0.12)', borderColor: 'rgba(191, 90, 242, 0.25)' }}>
                    <Swords size={18} />
                  </div>
                  <div className={styles.featureMeta}>
                    <span className={styles.featureTitle}>1v1 Problem Duels & 24h Pokes</span>
                    <span className={styles.featureDesc}>
                      Challenge peers to synchronized countdown duels and nudge inactive friends once every 24 hours.
                    </span>
                  </div>
                </div>

                <div className={styles.featureCard}>
                  <div className={styles.featureIconBox} style={{ color: '#30D158', background: 'rgba(48, 209, 88, 0.12)', borderColor: 'rgba(48, 209, 88, 0.25)' }}>
                    <BookOpen size={18} />
                  </div>
                  <div className={styles.featureMeta}>
                    <span className={styles.featureTitle}>Curated Lists & Chrome Extension</span>
                    <span className={styles.featureDesc}>
                      Track Blind 75, NeetCode 150, Grind 75, and automatically sync LeetCode solves using the browser companion.
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Action Footer */}
          <div className={styles.actionRow}>
            {step > 1 ? (
              <button
                type="button"
                className={styles.backBtn}
                onClick={() => setStep((prev) => (prev - 1) as 1 | 2)}
                disabled={isSubmitting}
              >
                Back
              </button>
            ) : (
              <div />
            )}

            <button
              type="button"
              className={styles.nextBtn}
              onClick={handleNext}
              disabled={isSubmitting}
            >
              <span>{step === 3 ? (isSubmitting ? 'Entering Workspace...' : 'Launch Workspace') : 'Continue'}</span>
              <ArrowRight size={15} />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default OnboardingModal;
