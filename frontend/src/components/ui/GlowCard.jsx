import { motion } from 'framer-motion';
import clsx from 'clsx';

export default function GlowCard({
  children,
  glowColor = 'purple',
  hover = true,
  selected = false,
  onClick,
  className = '',
  ...props
}) {
  const glowStyles = {
    purple: {
      border: 'rgba(108, 99, 255, 0.4)',
      shadow: '0 0 40px rgba(108, 99, 255, 0.3), inset 0 0 40px rgba(108, 99, 255, 0.05)',
    },
    cyan: {
      border: 'rgba(0, 212, 255, 0.4)',
      shadow: '0 0 40px rgba(0, 212, 255, 0.3), inset 0 0 40px rgba(0, 212, 255, 0.05)',
    },
    success: {
      border: 'rgba(0, 255, 136, 0.4)',
      shadow: '0 0 40px rgba(0, 255, 136, 0.3), inset 0 0 40px rgba(0, 255, 136, 0.05)',
    },
  };

  const glow = glowStyles[glowColor] || glowStyles.purple;

  return (
    <motion.div
      whileHover={hover && !selected ? {
        y: -8,
        borderColor: glow.border,
        boxShadow: glow.shadow,
        transition: { type: 'spring', stiffness: 300, damping: 20 },
      } : undefined}
      animate={selected ? {
        borderColor: glow.border,
        boxShadow: glow.shadow,
      } : {
        borderColor: 'rgba(108, 99, 255, 0.15)',
        boxShadow: 'none',
      }}
      onClick={onClick}
      className={clsx(
        'bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-2xl p-6',
        'transition-colors',
        onClick && 'cursor-pointer',
        className,
      )}
      {...props}
    >
      {children}
    </motion.div>
  );
}
