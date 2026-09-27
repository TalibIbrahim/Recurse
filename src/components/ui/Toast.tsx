'use client';

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastProps {
  message: string;
  type?: 'success' | 'info' | 'error';
  visible: boolean;
  onClose: () => void;
  durationMs?: number;
}

export const Toast: React.FC<ToastProps> = ({
  message,
  type = 'success',
  visible,
  onClose,
  durationMs = 3200,
}) => {
  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => {
      onClose();
    }, durationMs);
    return () => clearTimeout(timer);
  }, [visible, durationMs, onClose]);

  const icons = {
    success: <CheckCircle2 size={16} className="text-[#30D158]" />,
    error: <AlertCircle size={16} className="text-[#FF453A]" />,
    info: <Info size={16} className="text-[#0A84FF]" />,
  };

  return (
    <AnimatePresence>
      {visible && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[2000] pointer-events-none">
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 500, damping: 32 }}
            className="pointer-events-auto flex items-center gap-3 px-4 py-2.5 rounded-full bg-[rgba(24,24,27,0.88)] backdrop-blur-2xl border border-[rgba(255,255,255,0.12)] shadow-[0_12px_36px_rgba(0,0,0,0.5)] text-sm font-medium text-[#F4F4F5]"
          >
            <span className="flex-shrink-0">{icons[type]}</span>
            <span>{message}</span>
            <button
              type="button"
              onClick={onClose}
              className="ml-2 text-[#71717A] hover:text-[#F4F4F5] transition-colors"
              aria-label="Dismiss notification"
            >
              <X size={14} />
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default Toast;
