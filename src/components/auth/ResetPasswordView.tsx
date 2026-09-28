'use client';

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, Loader2, ArrowRight } from 'lucide-react';
import styles from './ResetPasswordView.module.css';
import { RecurseLogo } from '../ui/RecurseLogo';
import { SquaresBackground } from '../ui/SquaresBackground';

export interface ResetPasswordViewProps {
  onUpdatePassword: (password: string) => Promise<{ success: boolean; error?: string }>;
  onNotify?: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const ResetPasswordView: React.FC<ResetPasswordViewProps> = ({
  onUpdatePassword,
  onNotify,
}) => {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!password || password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await onUpdatePassword(password);
      if (!res.success) {
        setErrorMessage(res.error || 'Failed to update password. Your recovery link may have expired.');
        setLoading(false);
      } else {
        setSuccess(true);
        setLoading(false);
        onNotify?.('Password updated successfully! Welcome back.', 'success');
        setTimeout(() => {
          navigate('/today');
        }, 1500);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred.';
      setErrorMessage(msg);
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      {/* Background Canvas Grid */}
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
        <div className="mb-6 flex justify-center">
          <RecurseLogo size={24} showWordmark={true} />
        </div>

        <motion.div
          className={styles.card}
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className={styles.sheenTop} />

          {success ? (
            <div className={styles.successState}>
              <div className={styles.successIconCircle}>
                <CheckCircle2 size={32} />
              </div>
              <h2 className={styles.title}>Password Updated</h2>
              <p className={styles.subtitle}>
                Your password has been changed securely. Redirecting you to your dashboard...
              </p>
              <button
                type="button"
                className={styles.primaryBtn}
                onClick={() => navigate('/today')}
              >
                <span>Continue to Practice</span>
                <ArrowRight size={16} />
              </button>
            </div>
          ) : (
            <>
              <div className={styles.header}>
                <div className={styles.iconCircle}>
                  <Lock size={20} className="text-accent-blue" />
                </div>
                <h2 className={styles.title}>Set New Password</h2>
                <p className={styles.subtitle}>
                  Choose a strong password to protect your Recurse account and streak.
                </p>
              </div>

              {errorMessage && (
                <div className={styles.errorBox}>
                  <AlertCircle size={16} />
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className={styles.form}>
                <div className={styles.inputGroup}>
                  <label htmlFor="newPassword" className={styles.label}>
                    New Password
                  </label>
                  <div className={styles.passwordWrapper}>
                    <input
                      id="newPassword"
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="At least 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={styles.inputField}
                    />
                    <button
                      type="button"
                      className={styles.eyeBtn}
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className={styles.inputGroup}>
                  <label htmlFor="confirmPassword" className={styles.label}>
                    Confirm New Password
                  </label>
                  <input
                    id="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Repeat new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={styles.inputField}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className={styles.primaryBtn}
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Updating Password...</span>
                    </>
                  ) : (
                    <>
                      <span>Update Password</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </form>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default ResetPasswordView;
