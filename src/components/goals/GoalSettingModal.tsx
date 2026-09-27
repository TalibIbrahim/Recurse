'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Minus, Check, Calendar, Target, Sparkles } from 'lucide-react';
import styles from './GoalSettingModal.module.css';
import { GoalPresetType, GoalPresetConfig, GoalCadence } from '../../data/types';
import { GOAL_PRESETS } from '../../data/problemsSeed';

export interface GoalSettingModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPreset: GoalPresetType;
  currentEasyTarget: number;
  currentMediumTarget: number;
  currentHardTarget: number;
  currentCadence?: GoalCadence;
  currentWeeklyTarget?: number;
  onSavePreset: (preset: GoalPresetType) => Promise<void>;
  onSaveCustomGoal: (
    easy: number,
    medium: number,
    hard: number,
    weeklyTarget?: number,
    cadence?: GoalCadence
  ) => Promise<void>;
}

export const GoalSettingModal: React.FC<GoalSettingModalProps> = ({
  isOpen,
  onClose,
  currentPreset,
  currentEasyTarget,
  currentMediumTarget,
  currentHardTarget,
  currentCadence = 'both',
  currentWeeklyTarget = 10,
  onSavePreset,
  onSaveCustomGoal,
}) => {
  const [selectedPreset, setSelectedPreset] = useState<GoalPresetType>(currentPreset);
  const [easyTarget, setEasyTarget] = useState(currentEasyTarget);
  const [mediumTarget, setMediumTarget] = useState(currentMediumTarget);
  const [hardTarget, setHardTarget] = useState(currentHardTarget);
  const [cadence, setCadence] = useState<GoalCadence>(currentCadence);
  const [weeklyTarget, setWeeklyTarget] = useState(currentWeeklyTarget);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSelectedPreset(currentPreset);
      setEasyTarget(currentEasyTarget);
      setMediumTarget(currentMediumTarget);
      setHardTarget(currentHardTarget);
      setCadence(currentCadence);
      setWeeklyTarget(currentWeeklyTarget);
    }
  }, [
    isOpen,
    currentPreset,
    currentEasyTarget,
    currentMediumTarget,
    currentHardTarget,
    currentCadence,
    currentWeeklyTarget,
  ]);

  if (!isOpen) return null;

  const handleSelectPreset = (p: GoalPresetConfig) => {
    setSelectedPreset(p.preset);
    if (p.preset !== 'Custom') {
      setEasyTarget(p.easy_target);
      setMediumTarget(p.medium_target);
      setHardTarget(p.hard_target);
    }
  };

  const handleAdjustTarget = (diff: 'easy' | 'medium' | 'hard', delta: number) => {
    setSelectedPreset('Custom');
    if (diff === 'easy') setEasyTarget((prev) => Math.max(0, Math.min(10, prev + delta)));
    if (diff === 'medium') setMediumTarget((prev) => Math.max(0, Math.min(10, prev + delta)));
    if (diff === 'hard') setHardTarget((prev) => Math.max(0, Math.min(10, prev + delta)));
  };

  const handleAdjustWeekly = (delta: number) => {
    setWeeklyTarget((prev) => Math.max(1, Math.min(50, prev + delta)));
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      await onSaveCustomGoal(easyTarget, mediumTarget, hardTarget, weeklyTarget, cadence);
      onClose();
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
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          transition={{ type: 'spring', stiffness: 450, damping: 30 }}
        >
          <div className={styles.sheenTop} />

          <div className={styles.modalHeader}>
            <div>
              <h2 className={styles.title}>Practice Goal & Cadence</h2>
              <p className={styles.subtitle}>
                Configure your practice rhythm to match your schedule and accountability needs
              </p>
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

          {/* Cadence Mode Selection */}
          <div className={styles.sectionLabel}>Practice Cadence</div>
          <div className={styles.cadenceGrid}>
            <button
              type="button"
              className={`${styles.cadenceBtn} ${cadence === 'both' ? styles.cadenceBtnActive : ''}`}
              onClick={() => setCadence('both')}
            >
              <Sparkles size={14} className="text-accent-blue" />
              <span className={styles.cadenceLabel}>Dual Mode</span>
              <span className={styles.cadenceDesc}>Daily + Weekly</span>
            </button>

            <button
              type="button"
              className={`${styles.cadenceBtn} ${cadence === 'daily' ? styles.cadenceBtnActive : ''}`}
              onClick={() => setCadence('daily')}
            >
              <Target size={14} className="text-accent-green" />
              <span className={styles.cadenceLabel}>Daily Only</span>
              <span className={styles.cadenceDesc}>Habit Rings</span>
            </button>

            <button
              type="button"
              className={`${styles.cadenceBtn} ${cadence === 'weekly' ? styles.cadenceBtnActive : ''}`}
              onClick={() => setCadence('weekly')}
            >
              <Calendar size={14} className="text-accent-orange" />
              <span className={styles.cadenceLabel}>Weekly Only</span>
              <span className={styles.cadenceDesc}>Flexible Stretch</span>
            </button>
          </div>

          {/* Presets (when daily is active) */}
          {(cadence === 'daily' || cadence === 'both') && (
            <>
              <div className={styles.sectionLabel}>Daily Presets</div>
              <div className={styles.presetGrid}>
                {GOAL_PRESETS.map((p) => {
                  const isSelected = selectedPreset === p.preset;
                  return (
                    <button
                      key={p.preset}
                      type="button"
                      className={`${styles.presetButton} ${isSelected ? styles.presetActive : ''}`}
                      onClick={() => handleSelectPreset(p)}
                    >
                      <span className={styles.presetName}>{p.name}</span>
                      <span className={styles.presetTargets}>
                        {p.preset === 'Custom'
                          ? 'Custom Target'
                          : `${p.easy_target}E · ${p.medium_target}M · ${p.hard_target}H`}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className={styles.sectionLabel}>Target Solves Per Difficulty</div>
              <div className={styles.steppersList}>
                {/* Easy Stepper */}
                <div className={styles.stepperRow}>
                  <div className={styles.diffGroup}>
                    <div className={styles.diffDot} style={{ background: '#30D158' }} />
                    <span className={styles.diffLabel}>Easy</span>
                  </div>
                  <div className={styles.stepperControls}>
                    <button
                      type="button"
                      className={styles.stepperBtn}
                      onClick={() => handleAdjustTarget('easy', -1)}
                      disabled={easyTarget <= 0}
                      aria-label="Decrease easy target"
                    >
                      <Minus size={14} />
                    </button>
                    <span className={styles.stepperValue}>{easyTarget}</span>
                    <button
                      type="button"
                      className={styles.stepperBtn}
                      onClick={() => handleAdjustTarget('easy', 1)}
                      disabled={easyTarget >= 10}
                      aria-label="Increase easy target"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>

                {/* Medium Stepper */}
                <div className={styles.stepperRow}>
                  <div className={styles.diffGroup}>
                    <div className={styles.diffDot} style={{ background: '#FF9F0A' }} />
                    <span className={styles.diffLabel}>Medium</span>
                  </div>
                  <div className={styles.stepperControls}>
                    <button
                      type="button"
                      className={styles.stepperBtn}
                      onClick={() => handleAdjustTarget('medium', -1)}
                      disabled={mediumTarget <= 0}
                      aria-label="Decrease medium target"
                    >
                      <Minus size={14} />
                    </button>
                    <span className={styles.stepperValue}>{mediumTarget}</span>
                    <button
                      type="button"
                      className={styles.stepperBtn}
                      onClick={() => handleAdjustTarget('medium', 1)}
                      disabled={mediumTarget >= 10}
                      aria-label="Increase medium target"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>

                {/* Hard Stepper */}
                <div className={styles.stepperRow}>
                  <div className={styles.diffGroup}>
                    <div className={styles.diffDot} style={{ background: '#FF453A' }} />
                    <span className={styles.diffLabel}>Hard</span>
                  </div>
                  <div className={styles.stepperControls}>
                    <button
                      type="button"
                      className={styles.stepperBtn}
                      onClick={() => handleAdjustTarget('hard', -1)}
                      disabled={hardTarget <= 0}
                      aria-label="Decrease hard target"
                    >
                      <Minus size={14} />
                    </button>
                    <span className={styles.stepperValue}>{hardTarget}</span>
                    <button
                      type="button"
                      className={styles.stepperBtn}
                      onClick={() => handleAdjustTarget('hard', 1)}
                      disabled={hardTarget >= 10}
                      aria-label="Increase hard target"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Weekly Stretch Target Stepper */}
          {(cadence === 'weekly' || cadence === 'both') && (
            <>
              <div className={styles.sectionLabel}>Weekly Stretch Target (Problems / Week)</div>
              <div className={styles.steppersList}>
                <div className={styles.stepperRow}>
                  <div className={styles.diffGroup}>
                    <Calendar size={16} className="text-accent-blue" />
                    <span className={styles.diffLabel}>Weekly Target</span>
                  </div>
                  <div className={styles.stepperControls}>
                    <button
                      type="button"
                      className={styles.stepperBtn}
                      onClick={() => handleAdjustWeekly(-1)}
                      disabled={weeklyTarget <= 1}
                      aria-label="Decrease weekly target"
                    >
                      <Minus size={14} />
                    </button>
                    <span className={styles.stepperValue}>{weeklyTarget}</span>
                    <button
                      type="button"
                      className={styles.stepperBtn}
                      onClick={() => handleAdjustWeekly(1)}
                      disabled={weeklyTarget >= 50}
                      aria-label="Increase weekly target"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

          <div className={styles.actionsRow}>
            <button type="button" className={styles.cancelBtn} onClick={onClose}>
              Cancel
            </button>
            <button
              type="button"
              className={styles.saveBtn}
              onClick={handleSave}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : 'Apply Changes'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default GoalSettingModal;
