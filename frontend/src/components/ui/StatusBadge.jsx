import { motion } from 'framer-motion';
import clsx from 'clsx';

const statusConfig = {
  pending:    { color: 'var(--text-secondary)', bg: 'rgba(136,136,170,0.15)', label: 'Pending' },
  processing: { color: 'var(--accent-warning)', bg: 'rgba(255,184,0,0.15)', label: 'Processing', pulse: true },
  completed:  { color: 'var(--accent-success)', bg: 'rgba(0,255,136,0.15)', label: 'Completed' },
  failed:     { color: 'var(--accent-error)',   bg: 'rgba(255,68,102,0.15)', label: 'Failed' },
};

export default function StatusBadge({ status, className = '' }) {
  const config = statusConfig[status] || statusConfig.pending;

  return (
    <motion.span
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={clsx(
        'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold',
        className,
      )}
      style={{ color: config.color, backgroundColor: config.bg }}
    >
      <motion.span
        className="w-1.5 h-1.5 rounded-full"
        style={{ backgroundColor: config.color }}
        animate={config.pulse ? { scale: [1, 1.5, 1], opacity: [1, 0.5, 1] } : {}}
        transition={config.pulse ? { repeat: Infinity, duration: 1.5 } : {}}
      />
      {config.label}
    </motion.span>
  );
}
