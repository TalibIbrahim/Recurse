'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, AlertCircle, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';
import styles from './AuthModal.module.css';
import { RecurseLogo } from '../ui/RecurseLogo';

export interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSignInWithEmail: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  onSignUpWithEmail: (
    email: string,
    password: string,
    username: string,
    fullName?: string
  ) => Promise<{ success: boolean; error?: string }>;
  onSuccess?: (type: 'signin' | 'signup', username?: string) => void;
  initialMode?: 'signin' | 'signup';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSignInWithEmail,
  onSignUpWithEmail,
  onSuccess,
  initialMode = 'signin',
}) => {
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{ title: string; subtitle: string } | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setErrorMessage(null);
      setSuccessInfo(null);
    }
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email || !password) {
      setErrorMessage('Please enter both your email and password.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'signin') {
        const res = await onSignInWithEmail(email, password);
        if (!res.success) {
          setErrorMessage(res.error || 'Invalid email or password.');
          setLoading(false);
        } else {
          setSuccessInfo({
            title: 'Welcome Back',
            subtitle: 'Signing you in to your practice workspace...',
          });
          setTimeout(() => {
            onSuccess?.('signin');
            onClose();
            setSuccessInfo(null);
          }, 800);
        }
      } else {
        if (!username) {
          setErrorMessage('Please choose a username for peer accountability.');
          setLoading(false);
          return;
        }
        const res = await onSignUpWithEmail(email, password, username, fullName);
        if (!res.success) {
          setErrorMessage(res.error || 'Failed to create your account.');
          setLoading(false);
        } else {
          setSuccessInfo({
            title: 'Account Created',
            subtitle: 'Setting up your customized practice profile...',
          });
          setTimeout(() => {
            onSuccess?.('signup', username);
            onClose();
            setSuccessInfo(null);
          }, 900);
        }
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Authentication failed.');
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className={styles.overlay} onClick={onClose} role="dialog" aria-modal="true">
        <motion.div
          className={styles.modalCard}
          onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, scale: 0.94, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 16 }}
          transition={{ type: 'spring', stiffness: 450, damping: 30 }}
        >
          <div className={styles.sheenTop} />

          {/* Success Reaction View */}
          {successInfo ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className={styles.successBox}
            >
              <div className={styles.successIconCircle}>
                <CheckCircle2 size={32} />
              </div>
              <h3 className={styles.successTitle}>{successInfo.title}</h3>
              <p className={styles.successSubtitle}>{successInfo.subtitle}</p>
            </motion.div>
          ) : (
            <>
              {/* Modal Header */}
          <div className={styles.modalHeader}>
            <div className={styles.titleArea}>
              <div className="mb-2">
                <RecurseLogo size={22} showWordmark={true} />
              </div>
              <h2 className={styles.title}>
                {mode === 'signin' ? 'Welcome Back' : 'Join Recurse'}
              </h2>
              <p className={styles.subtitle}>
                {mode === 'signin'
                  ? 'Sign in to access your daily goals and peer group'
                  : 'Start your algorithmic consistency journey today'}
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

          {/* Tab Selector */}
          <div className={styles.tabSegmentedControl} role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'signin'}
              className={`${styles.tabSegment} ${
                mode === 'signin' ? styles.tabSegmentActive : ''
              }`}
              onClick={() => {
                setMode('signin');
                setErrorMessage(null);
              }}
            >
              {mode === 'signin' && (
                <motion.div
                  layoutId="authModalTabIndicator"
                  className={styles.tabActiveIndicator}
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
              Sign In
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={mode === 'signup'}
              className={`${styles.tabSegment} ${
                mode === 'signup' ? styles.tabSegmentActive : ''
              }`}
              onClick={() => {
                setMode('signup');
                setErrorMessage(null);
              }}
            >
              {mode === 'signup' && (
                <motion.div
                  layoutId="authModalTabIndicator"
                  className={styles.tabActiveIndicator}
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
              Create Account
            </button>
          </div>

          {/* Form */}
          <form className={styles.form} onSubmit={handleSubmit}>
            {errorMessage && (
              <div className={styles.errorBox}>
                <AlertCircle size={16} />
                <span>{errorMessage}</span>
              </div>
            )}

            {mode === 'signup' && (
              <>
                <div className={styles.inputGroup}>
                  <label htmlFor="username" className={styles.label}>
                    Username
                  </label>
                  <input
                    id="username"
                    type="text"
                    required
                    placeholder="e.g. algo_master"
                    className={styles.inputField}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
                <div className={styles.inputGroup}>
                  <label htmlFor="fullName" className={styles.label}>
                    Full Name (Optional)
                  </label>
                  <input
                    id="fullName"
                    type="text"
                    placeholder="e.g. Jane Doe"
                    className={styles.inputField}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>
              </>
            )}

            <div className={styles.inputGroup}>
              <label htmlFor="authEmail" className={styles.label}>
                Email Address
              </label>
              <input
                id="authEmail"
                type="email"
                required
                placeholder="name@example.com"
                className={styles.inputField}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className={styles.inputGroup}>
              <label htmlFor="authPassword" className={styles.label}>
                Password
              </label>
              <input
                id="authPassword"
                type="password"
                required
                placeholder="••••••••"
                className={styles.inputField}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className={styles.submitButton}
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Processing...</span>
                </>
              ) : mode === 'signin' ? (
                'Sign In with Email'
              ) : (
                'Complete Registration'
              )}
            </button>
          </form>
          </>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default AuthModal;
