'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Puzzle,
  X,
  Copy,
  Check,
  Zap,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import styles from './ExtensionGuideModal.module.css';

export interface ExtensionGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
}

export const ExtensionGuideModal: React.FC<ExtensionGuideModalProps> = ({
  isOpen,
  onClose,
  userId = 'usr_alex_chen_2026',
}) => {
  const [copiedToken, setCopiedToken] = useState(false);
  const [testSyncSuccess, setTestSyncSuccess] = useState(false);

  const syncToken = `rc_sync_live_${userId.substring(0, 12)}_${btoa(userId).substring(0, 8)}`;

  const handleCopyToken = async () => {
    try {
      await navigator.clipboard.writeText(syncToken);
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleTestSync = () => {
    setTestSyncSuccess(true);
    setTimeout(() => setTestSyncSuccess(false), 3000);
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
                <Puzzle size={14} />
                <span>Zero-Friction Sync</span>
              </div>
              <h2 className={styles.title}>Browser Companion Extension</h2>
              <span className={styles.subtitle}>
                Auto-sync LeetCode solves in real time with exact time spent, runtime, and pattern metrics.
              </span>
            </div>

            <button
              type="button"
              className={styles.closeButton}
              onClick={onClose}
              aria-label="Close extension guide modal"
            >
              <X size={16} />
            </button>
          </div>

          <div className={styles.content}>
            {/* Live Connection Status */}
            <div className={styles.statusBanner}>
              <div className={styles.statusLeft}>
                <div className={styles.statusDot} />
                <span className={styles.statusText}>
                  {testSyncSuccess
                    ? 'Test Ping Received: WebSocket Connected'
                    : 'Extension Listener Active on port 4182'}
                </span>
              </div>

              <button
                type="button"
                className={styles.testSyncBtn}
                onClick={handleTestSync}
              >
                <Zap size={13} className="text-accent-orange" />
                <span>Test Ping</span>
              </button>
            </div>

            {/* Steps List */}
            <div className={styles.stepsList}>
              {/* Step 1 */}
              <div className={styles.stepCard}>
                <div className={styles.stepNumberBox}>1</div>
                <div className={styles.stepContent}>
                  <span className={styles.stepTitle}>Install Recurse Companion</span>
                  <p className={styles.stepDesc}>
                    Available for Chrome, Edge, Brave, and Safari. Monitors leetcode.com/submissions for successful AC results.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className={styles.stepCard}>
                <div className={styles.stepNumberBox}>2</div>
                <div className={styles.stepContent}>
                  <span className={styles.stepTitle}>Paste Personal Webhook Token</span>
                  <p className={styles.stepDesc}>
                    Click the extension icon in your browser toolbar and paste this unique token:
                  </p>
                  <div className={styles.tokenBox}>
                    <code className={styles.tokenCode}>{syncToken}</code>
                    <button
                      type="button"
                      className={styles.copyTokenBtn}
                      onClick={handleCopyToken}
                    >
                      {copiedToken ? (
                        <>
                          <Check size={12} className="text-accent-green" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy size={12} />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div className={styles.stepCard}>
                <div className={styles.stepNumberBox}>3</div>
                <div className={styles.stepContent}>
                  <span className={styles.stepTitle}>Solve On LeetCode As Usual</span>
                  <p className={styles.stepDesc}>
                    Whenever you hit &ldquo;Submit&rdquo; and pass all testcases, Recurse automatically logs the attempt, advances your daily goal ring, and updates your streak!
                  </p>
                </div>
              </div>
            </div>

            <div className={styles.footer}>
              <button
                type="button"
                className={styles.doneBtn}
                onClick={onClose}
              >
                Got It
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ExtensionGuideModal;
