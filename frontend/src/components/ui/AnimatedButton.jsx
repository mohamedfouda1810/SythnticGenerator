import { motion } from 'framer-motion';
import clsx from 'clsx';

const variants = {
  idle: { scale: 1 },
  hover: { 
    scale: 1.02, 
    transition: { type: 'spring', stiffness: 400, damping: 15 }
  },
  tap: { scale: 0.98 },
};

export default function AnimatedButton({
  children,
  onClick,
  type = 'button',
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon: Icon,
  className = '',
  ...props
}) {
  const baseClasses = 'relative inline-flex items-center justify-center gap-2 font-bold transition-all duration-300 select-none overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-[0.15em] text-xs';

  const sizeClasses = {
    sm: 'px-5 py-2.5 rounded-lg',
    md: 'px-8 py-4 rounded-xl',
    lg: 'px-10 py-5 text-sm rounded-2xl',
  };

  const variantClasses = {
    primary: 'bg-gradient-to-r from-indigo-500 to-blue-500 text-white shadow-lg hover:shadow-[0_0_20px_rgba(99,102,241,0.5)] border border-white/10',
    secondary: 'bg-white/5 text-white border border-white/10 hover:bg-white/10 hover:border-white/20 backdrop-blur-md glass-morphism',
    ghost: 'bg-transparent text-gray-400 hover:text-white hover:bg-white/5',
    success: 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg hover:shadow-[0_0_20px_rgba(16,185,129,0.5)] border border-white/10',
    danger: 'bg-gradient-to-r from-red-500 to-rose-500 text-white shadow-lg hover:shadow-[0_0_20px_rgba(239,68,68,0.5)] border border-white/10',
  };

  return (
    <motion.button
      variants={variants}
      initial="idle"
      whileHover={disabled || loading ? "idle" : "hover"}
      whileTap={disabled || loading ? "idle" : "tap"}
      onClick={disabled || loading ? undefined : onClick}
      type={type}
      disabled={disabled || loading}
      className={clsx(baseClasses, sizeClasses[size], variantClasses[variant], className)}
      {...props}
    >
      {/* SaaS Shine Effect */}
      <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shine pointer-events-none" />
      
      {loading ? (
        <div className="flex items-center gap-3">
          <motion.div
            className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
          />
          <span className="tracking-widest">Processing</span>
        </div>
      ) : (
        <>
          {Icon && <Icon size={size === 'sm' ? 14 : size === 'lg' ? 20 : 18} className="shrink-0" />}
          <span className="relative z-10">{children}</span>
        </>
      )}
    </motion.button>
  );
}
