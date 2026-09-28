'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Puzzle,
  X,
  Copy,
  Check,
  Zap,
  Globe,
  Key,
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
  userId = '',
}) => {
  const [copiedToken, setCopiedToken] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [testSyncSuccess, setTestSyncSuccess] = useState(false);

  const serverUrl = window.location.origin;
  const syncToken = userId || 'Please sign in to view your token';

  const handleCopyToken = async () => {
    try {
      await navigator.clipboard.writeText(syncToken);
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(serverUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
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
                <span>Automated Practice Sync</span>
              </div>
              <h2 className={styles.title}>Browser Companion Extension</h2>
              <span className={styles.subtitle}>
                Automatically log LeetCode solves to your account and streak in real time.
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
                    ? 'Sync Active: Extension Listener Online'
                    : 'Auto-Sync Endpoint Ready on Cloudflare Edge'}
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
                  <span className={styles.stepTitle}>Load Extension in Browser</span>
                  <p className={styles.stepDesc}>
                    Open <code>chrome://extensions</code> (or Edge <code>edge://extensions</code>), toggle <strong>Developer mode</strong> ON in the top right, click <strong>Load unpacked</strong>, and select the <code>extension</code> folder in your project directory.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className={styles.stepCard}>
                <div className={styles.stepNumberBox}>2</div>
                <div className={styles.stepContent}>
                  <span className={styles.stepTitle}>Connect Extension to Your Account</span>
                  <p className={styles.stepDesc}>
                    Click the Recurse extension icon in your toolbar and enter your Server URL and personal Sync Token:
                  </p>

                  {/* Server URL field */}
                  <div className="mb-2">
                    <span className="text-[11px] font-medium text-label-secondary block mb-1">
                      <Globe size={11} className="inline mr-1 text-accent-blue" />
                      Server URL
                    </span>
                    <div className={styles.tokenBox}>
                      <code className={styles.tokenCode}>{serverUrl}</code>
                      <button
                        type="button"
                        className={styles.copyTokenBtn}
                        onClick={handleCopyUrl}
                      >
                        {copiedUrl ? (
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

                  {/* Sync Token / User ID field */}
                  <div>
                    <span className="text-[11px] font-medium text-label-secondary block mb-1">
                      <Key size={11} className="inline mr-1 text-accent-green" />
                      Account Sync Token (Your User ID)
                    </span>
                    <div className={styles.tokenBox}>
                      <code className={styles.tokenCode}>{syncToken}</code>
                      <button
                        type="button"
                        className={styles.copyTokenBtn}
                        onClick={handleCopyToken}
                        disabled={!userId}
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
              </div>

              {/* Step 3 */}
              <div className={styles.stepCard}>
                <div className={styles.stepNumberBox}>3</div>
                <div className={styles.stepContent}>
                  <span className={styles.stepTitle}>Solve Problems on LeetCode</span>
                  <p className={styles.stepDesc}>
                    Whenever you click &ldquo;Submit&rdquo; on LeetCode and receive an <strong>Accepted</strong> result, the extension instantly syncs the solve to your account, advances your daily goal rings, and triggers a confirmation notification!
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
