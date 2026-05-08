import { motion } from 'framer-motion';
import clsx from 'clsx';

const variants = {
  idle: { scale: 1 },
  hover: { scale: 1.03, y: -2 },
  tap: { scale: 0.97 },
};

export default function AnimatedButton({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon: Icon,
  className = '',
  ...props
}) {
  const baseClasses = 'relative inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-colors cursor-pointer select-none overflow-hidden';

  const sizeClasses = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
  };

  const variantClasses = {
    primary: 'bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-primary-light)]',
    secondary: 'bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border-default)] hover:border-[var(--border-hover)]',
    ghost: 'bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]',
    success: 'bg-[var(--accent-success)] text-[var(--bg-primary)] hover:brightness-110',
    danger: 'bg-[var(--accent-error)] text-white hover:brightness-110',
  };

  return (
    <motion.button
      variants={variants}
      initial="idle"
      whileHover={disabled ? undefined : "hover"}
      whileTap={disabled ? undefined : "tap"}
      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
      onClick={disabled || loading ? undefined : onClick}
      disabled={disabled || loading}
      className={clsx(
        baseClasses,
        sizeClasses[size],
        variantClasses[variant],
        (disabled || loading) && 'opacity-50 cursor-not-allowed',
        className,
      )}
      {...props}
    >
      {/* Shimmer overlay on hover */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
        initial={{ x: '-100%' }}
        whileHover={{ x: '100%' }}
        transition={{ duration: 0.6 }}
      />

      {loading ? (
        <motion.div
          className="w-5 h-5 border-2 border-current border-t-transparent rounded-full"
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
        />
      ) : Icon ? (
        <Icon size={size === 'sm' ? 16 : size === 'lg' ? 22 : 18} />
      ) : null}
      <span className="relative z-10">{children}</span>
    </motion.button>
  );
}
