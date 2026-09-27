import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';

export interface GlassCardProps extends HTMLMotionProps<'div'> {
  children?: React.ReactNode;
  variant?: 'default' | 'interactive' | 'elevated' | 'subtle';
  glow?: 'none' | 'green' | 'orange' | 'red' | 'blue' | 'purple';
  className?: string;
  onClick?: () => void;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  variant = 'default',
  glow = 'none',
  className = '',
  onClick,
  ...motionProps
}) => {
  const variantStyles = {
    default: 'bg-glass backdrop-blur-glass-default shadow-glass-resting border border-glass-border',
    interactive: 'bg-glass backdrop-blur-glass-default shadow-glass-resting border border-glass-border cursor-pointer transition-colors hover:border-white/25 active:border-white/30',
    elevated: 'bg-glass-elevated backdrop-blur-glass-elevated shadow-glass-elevated border border-glass-border',
    subtle: 'bg-glass-subtle backdrop-blur-glass-subtle shadow-sm border border-glass-border',
  }[variant];

  const glowStyles = {
    none: '',
    green: 'shadow-glow-green border-accent-green/30',
    orange: 'shadow-glow-orange border-accent-orange/30',
    red: 'shadow-glow-red border-accent-red/30',
    blue: 'shadow-glow-blue border-accent-blue/30',
    purple: 'shadow-glow-purple border-accent-purple/30',
  }[glow];

  const isInteractive = variant === 'interactive' || !!onClick;

  return (
    <motion.div
      onClick={onClick}
      className={`relative rounded-card overflow-hidden ${variantStyles} ${glowStyles} ${className}`}
      whileHover={isInteractive ? { y: -2, transition: { type: 'spring', stiffness: 400, damping: 28 } } : undefined}
      whileTap={isInteractive ? { scale: 0.985, transition: { type: 'spring', stiffness: 500, damping: 30 } } : undefined}
      {...motionProps}
    >
      {/* Specular sheen highlight along top edge */}
      <div 
        className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-glass-sheen to-transparent opacity-80"
        aria-hidden="true" 
      />
      {children}
    </motion.div>
  );
};

export default GlassCard;
