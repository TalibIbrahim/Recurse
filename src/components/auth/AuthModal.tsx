'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  AlertCircle,
  ArrowRight,
  Loader2,
  CheckCircle2,
  Eye,
  EyeOff,
  Mail,
  ArrowLeft,
} from 'lucide-react';
import styles from './AuthModal.module.css';
import { RecurseLogo } from '../ui/RecurseLogo';

export type AuthModalMode = 'signin' | 'signup' | 'forgot-password';

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
  onSignInWithOAuth?: (provider: 'github' | 'google') => Promise<{ success: boolean; error?: string }>;
  onResetPasswordForEmail?: (email: string) => Promise<{ success: boolean; error?: string }>;
  onSuccess?: (type: 'signin' | 'signup', username?: string) => void;
  initialMode?: AuthModalMode;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSignInWithEmail,
  onSignUpWithEmail,
  onSignInWithOAuth,
  onResetPasswordForEmail,
  onSuccess,
  initialMode = 'signin',
}) => {
  const [mode, setMode] = useState<AuthModalMode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);
  const [successInfo, setSuccessInfo] = useState<{ title: string; subtitle: string } | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setErrorMessage(null);
      setSuccessInfo(null);
      setResetSent(false);
    }
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  const handleOAuthLogin = async (provider: 'google') => {
    if (!onSignInWithOAuth) return;
    setErrorMessage(null);
    setOauthLoading(true);
    try {
      const res = await onSignInWithOAuth(provider);
      if (!res.success) {
        setErrorMessage(
          res.error ||
            'Google Sign-In requires OAuth credentials in your Supabase project dashboard.'
        );
        setOauthLoading(false);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Google authentication failed';
      setErrorMessage(msg);
      setOauthLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email) {
      setErrorMessage('Please enter your email address.');
      return;
    }

    if (!onResetPasswordForEmail) {
      setErrorMessage('Password recovery is not configured.');
      return;
    }

    setLoading(true);
    try {
      const res = await onResetPasswordForEmail(email);
      setLoading(false);
      if (!res.success) {
        setErrorMessage(res.error || 'Failed to send recovery link.');
      } else {
        setResetSent(true);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to request password reset';
      setErrorMessage(msg);
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (mode === 'forgot-password') {
      return handleForgotPassword(e);
    }

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
          ) : mode === 'forgot-password' ? (
            <>
              {/* Forgot Password Header */}
              <div className={styles.modalHeader}>
                <div className={styles.titleArea}>
                  <div className="mb-2">
                    <RecurseLogo size={22} showWordmark={true} />
                  </div>
                  <h2 className={styles.title}>Reset Password</h2>
                  <p className={styles.subtitle}>
                    Enter your email to receive a secure recovery link.
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

              {resetSent ? (
                <div className="py-4 flex flex-col items-center text-center gap-3">
                  <div className={styles.successIconCircle}>
                    <Mail size={28} />
                  </div>
                  <h3 className="font-semibold text-base text-label-primary">Check Your Email</h3>
                  <p className="text-xs text-label-secondary max-w-xs leading-relaxed">
                    We've dispatched a password recovery link to <strong className="text-label-primary">{email}</strong>. Open the link to set your new password.
                  </p>
                  <button
                    type="button"
                    className={styles.backToSignInBtn}
                    onClick={() => {
                      setMode('signin');
                      setResetSent(false);
                    }}
                  >
                    <ArrowLeft size={14} />
                    <span>Back to Sign In</span>
                  </button>
                </div>
              ) : (
                <form className={styles.form} onSubmit={handleForgotPassword}>
                  {errorMessage && (
                    <div className={styles.errorBox}>
                      <AlertCircle size={16} />
                      <span>{errorMessage}</span>
                    </div>
                  )}

                  <div className={styles.inputGroup}>
                    <label htmlFor="resetEmail" className={styles.label}>
                      Account Email
                    </label>
                    <input
                      id="resetEmail"
                      type="email"
                      required
                      placeholder="name@example.com"
                      className={styles.inputField}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
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
                        <span>Sending Link...</span>
                      </>
                    ) : (
                      <>
                        <span>Send Recovery Link</span>
                        <ArrowRight size={15} />
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    className={styles.backToSignInBtn}
                    onClick={() => {
                      setMode('signin');
                      setErrorMessage(null);
                    }}
                  >
                    <ArrowLeft size={14} />
                    <span>Return to Sign In</span>
                  </button>
                </form>
              )}
            </>
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
                      ? 'Sign in to access your daily practice and peer accountability'
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

              {/* Google OAuth Button */}
              {onSignInWithOAuth && (
                <>
                  <button
                    type="button"
                    disabled={oauthLoading || loading}
                    className={styles.googleButton}
                    onClick={() => handleOAuthLogin('google')}
                  >
                    {oauthLoading ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                        <path
                          fill="#4285F4"
                          d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.16 0 9.99 0 12s.45 3.84 1.25 5.42l4.03-3.15z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                        />
                      </svg>
                    )}
                    <span>
                      {mode === 'signin' ? 'Continue with Google' : 'Sign up with Google'}
                    </span>
                  </button>

                  <div className={styles.divider}>
                    <div className={styles.dividerLine} />
                    <span className={styles.dividerText}>or continue with email</span>
                    <div className={styles.dividerLine} />
                  </div>
                </>
              )}

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
                  <div className={styles.passwordLabelRow}>
                    <label htmlFor="authPassword" className={styles.label}>
                      Password
                    </label>
                    {mode === 'signin' && (
                      <button
                        type="button"
                        className={styles.forgotPasswordLink}
                        onClick={() => {
                          setMode('forgot-password');
                          setErrorMessage(null);
                        }}
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className={styles.passwordWrapper}>
                    <input
                      id="authPassword"
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="••••••••"
                      className={styles.inputField}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      className={styles.eyeToggle}
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
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
