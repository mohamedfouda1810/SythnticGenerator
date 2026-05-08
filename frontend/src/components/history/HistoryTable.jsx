import { motion } from 'framer-motion';
import { Trash2, ExternalLink, Brain, Wand2 } from 'lucide-react';
import StatusBadge from '../ui/StatusBadge';
import { formatDate, formatNumber, formatScore, getScoreColor } from '../../utils/formatters';

const rowVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05, type: 'spring', stiffness: 200, damping: 20 },
  }),
};

export default function HistoryTable({ jobs, onDelete, loading }) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-16 bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-xl animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-20"
      >
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
          className="w-20 h-20 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-default)] flex items-center justify-center mx-auto mb-6"
        >
          <Wand2 size={32} className="text-[var(--text-tertiary)]" />
        </motion.div>
        <h3 className="text-lg font-semibold mb-2 text-[var(--text-secondary)]">
          No generations yet
        </h3>
        <p className="text-sm text-[var(--text-tertiary)]">
          Start generating synthetic data to see your history here
        </p>
      </motion.div>
    );
  }

  return (
    <div className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="hidden md:grid grid-cols-[1fr_100px_100px_100px_140px_80px_50px] gap-4 px-5 py-3 border-b border-[var(--border-default)] text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
        <span>Mode</span>
        <span>Status</span>
        <span>Rows</span>
        <span>Quality</span>
        <span>Created</span>
        <span>File</span>
        <span></span>
      </div>

      {/* Rows */}
      {jobs.map((job, i) => (
        <motion.div
          key={job.id}
          custom={i}
          variants={rowVariants}
          initial="hidden"
          animate="visible"
          className="group grid grid-cols-1 md:grid-cols-[1fr_100px_100px_100px_140px_80px_50px] gap-4 px-5 py-4 border-b border-[var(--border-default)] last:border-b-0 hover:bg-[var(--bg-tertiary)]/50 transition-colors items-center relative overflow-hidden"
        >
          {/* Hover highlight */}
          <div className="absolute inset-0 bg-gradient-to-r from-[var(--accent-primary)]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

          {/* Mode */}
          <div className="flex items-center gap-3 relative z-10">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
              job.mode === 'ctgan'
                ? 'bg-[var(--accent-primary)]/15'
                : 'bg-[var(--accent-secondary)]/15'
            }`}>
              {job.mode === 'ctgan'
                ? <Brain size={18} className="text-[var(--accent-primary)]" />
                : <Wand2 size={18} className="text-[var(--accent-secondary)]" />
              }
            </div>
            <div>
              <span className="font-semibold text-sm uppercase">{job.mode}</span>
              {job.file_name && (
                <p className="text-xs text-[var(--text-tertiary)] truncate max-w-[180px]">
                  {job.file_name}
                </p>
              )}
            </div>
          </div>

          {/* Status */}
          <div className="relative z-10">
            <StatusBadge status={job.status} />
          </div>

          {/* Rows */}
          <div className="text-sm font-mono text-[var(--text-primary)] relative z-10">
            {formatNumber(job.num_rows_generated || job.num_rows_requested)}
          </div>

          {/* Quality */}
          <div className="relative z-10">
            {job.quality_score != null ? (
              <span className="text-sm font-semibold" style={{ color: getScoreColor(job.quality_score) }}>
                {formatScore(job.quality_score)}
              </span>
            ) : (
              <span className="text-sm text-[var(--text-tertiary)]">—</span>
            )}
          </div>

          {/* Date */}
          <div className="text-xs text-[var(--text-secondary)] relative z-10">
            {formatDate(job.created_at)}
          </div>

          {/* File indicator */}
          <div className="relative z-10">
            {job.file_name && (
              <span className="text-xs text-[var(--text-tertiary)] bg-[var(--bg-tertiary)] px-2 py-0.5 rounded">
                CSV
              </span>
            )}
          </div>

          {/* Delete */}
          <div className="relative z-10">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => onDelete(job.id)}
              className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--accent-error)] hover:bg-[var(--accent-error)]/10 transition-colors opacity-0 group-hover:opacity-100"
            >
              <Trash2 size={14} />
            </motion.button>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
