import { motion } from 'framer-motion';
import { Brain, Wand2, Calendar, Hash, Award } from 'lucide-react';
import StatusBadge from '../ui/StatusBadge';
import { formatDate, formatNumber, formatScore, getScoreColor } from '../../utils/formatters';

export default function JobCard({ job, onClick }) {
  return (
    <motion.div
      whileHover={{ y: -4, borderColor: 'rgba(108, 99, 255, 0.3)' }}
      onClick={onClick}
      className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-xl p-5 cursor-pointer transition-shadow hover:shadow-lg"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            job.mode === 'ctgan'
              ? 'bg-[var(--accent-primary)]/15'
              : 'bg-[var(--accent-secondary)]/15'
          }`}>
            {job.mode === 'ctgan'
              ? <Brain size={20} className="text-[var(--accent-primary)]" />
              : <Wand2 size={20} className="text-[var(--accent-secondary)]" />
            }
          </div>
          <div>
            <h4 className="font-semibold text-sm uppercase">{job.mode}</h4>
            {job.file_name && (
              <p className="text-xs text-[var(--text-tertiary)] truncate max-w-[150px]">
                {job.file_name}
              </p>
            )}
          </div>
        </div>
        <StatusBadge status={job.status} />
      </div>

      <div className="grid grid-cols-3 gap-3 text-center">
        <div>
          <div className="flex items-center justify-center gap-1 text-[var(--text-tertiary)] mb-1">
            <Hash size={12} />
            <span className="text-xs">Rows</span>
          </div>
          <span className="text-sm font-semibold font-mono">
            {formatNumber(job.num_rows_generated || job.num_rows_requested)}
          </span>
        </div>
        <div>
          <div className="flex items-center justify-center gap-1 text-[var(--text-tertiary)] mb-1">
            <Award size={12} />
            <span className="text-xs">Quality</span>
          </div>
          <span
            className="text-sm font-semibold"
            style={{ color: getScoreColor(job.quality_score) }}
          >
            {formatScore(job.quality_score)}
          </span>
        </div>
        <div>
          <div className="flex items-center justify-center gap-1 text-[var(--text-tertiary)] mb-1">
            <Calendar size={12} />
            <span className="text-xs">Date</span>
          </div>
          <span className="text-xs text-[var(--text-secondary)]">
            {formatDate(job.created_at)}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
