import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Trash2, Brain, Wand2 } from 'lucide-react';
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
  const navigate = useNavigate();
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
    <div className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-[2rem] overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="hidden md:grid grid-cols-[1.5fr_120px_100px_120px_160px_100px_80px] gap-4 px-8 py-5 border-b border-[var(--border-default)] bg-[var(--bg-tertiary)]/30 text-[10px] font-black text-[var(--text-tertiary)] uppercase tracking-[0.2em]">
        <span>Generation Mode / Source</span>
        <span>Status</span>
        <span className="text-center">Records</span>
        <span className="text-center">Quality Score</span>
        <span>Created Date</span>
        <span className="text-center">Format</span>
        <span className="text-right">Actions</span>
      </div>

      {/* Rows */}
      <div className="divide-y divide-[var(--border-default)]">
        {jobs.map((job, i) => (
          <motion.div
            key={job.id}
            custom={i}
            variants={rowVariants}
            initial="hidden"
            animate="visible"
            onClick={() => navigate(`/history/${job.id}`)}
            className="group grid grid-cols-1 md:grid-cols-[1.5fr_120px_100px_120px_160px_100px_80px] gap-4 px-8 py-6 hover:bg-[var(--accent-primary)]/[0.02] transition-all duration-300 items-center relative cursor-pointer"
          >
            {/* Mode & Source */}
            <div className="flex items-center gap-4 relative z-10">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner transition-transform group-hover:scale-110 duration-500 ${
                job.mode === 'ctgan'
                  ? 'bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]'
                  : 'bg-[var(--accent-secondary)]/10 text-[var(--accent-secondary)]'
              }`}>
                {job.mode === 'ctgan'
                  ? <Brain size={24} />
                  : <Wand2 size={24} />
                }
              </div>
              <div className="min-w-0">
                <span className="block font-bold text-sm uppercase tracking-wider text-[var(--text-primary)]">{job.mode}</span>
                {job.file_name ? (
                  <p className="text-xs text-[var(--text-tertiary)] truncate max-w-[200px] mt-0.5 font-medium">
                    {job.file_name}
                  </p>
                ) : (
                  <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5 font-bold uppercase tracking-tighter opacity-50">Synthetic Schema</p>
                )}
              </div>
            </div>

            {/* Status */}
            <div className="relative z-10">
              <StatusBadge status={job.status} />
            </div>

            {/* Records */}
            <div className="text-sm font-mono font-bold text-[var(--text-secondary)] text-center relative z-10">
              {formatNumber(job.num_rows_generated || job.num_rows_requested)}
            </div>

            {/* Quality */}
            <div className="text-center relative z-10">
              {job.quality_score != null ? (
                <div className="flex flex-col items-center">
                  <span className="text-sm font-black" style={{ color: getScoreColor(job.quality_score) }}>
                    {formatScore(job.quality_score)}
                  </span>
                  <div className="w-12 h-1 rounded-full bg-[var(--bg-tertiary)] mt-1.5 overflow-hidden">
                    <div 
                      className="h-full rounded-full" 
                      style={{ 
                        width: `${Math.min(Math.max(job.quality_score, 0), 100)}%`,
                        backgroundColor: getScoreColor(job.quality_score)
                      }} 
                    />
                  </div>
                </div>
              ) : (
                <span className="text-xs font-bold text-[var(--text-tertiary)] uppercase opacity-40">Pending</span>
              )}
            </div>

            {/* Date */}
            <div className="text-xs font-medium text-[var(--text-secondary)] relative z-10">
              <div className="flex flex-col">
                <span>{formatDate(job.created_at).split(',')[0]}</span>
                <span className="text-[10px] text-[var(--text-tertiary)]">{formatDate(job.created_at).split(',')[1]}</span>
              </div>
            </div>

            {/* File Format */}
            <div className="text-center relative z-10">
              <span className="inline-flex items-center justify-center px-3 py-1 rounded-lg bg-[var(--bg-tertiary)] text-[10px] font-black text-[var(--text-tertiary)] uppercase tracking-widest border border-[var(--border-default)]">
                CSV
              </span>
            </div>

            {/* Actions */}
            <div className="relative z-10 flex justify-end">
              <motion.button
                whileHover={{ scale: 1.2, backgroundColor: 'rgba(255, 68, 102, 0.1)', color: 'var(--accent-error)' }}
                whileTap={{ scale: 0.9 }}
                onClick={(e) => { e.stopPropagation(); onDelete(job.id); }}
                className="p-2.5 rounded-xl text-[var(--text-tertiary)] transition-all md:opacity-0 group-hover:opacity-100"
              >
                <Trash2 size={18} />
              </motion.button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
