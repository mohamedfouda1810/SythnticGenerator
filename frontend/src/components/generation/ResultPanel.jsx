import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Download, Table, Award, TrendingUp, ChevronLeft, ChevronRight } from 'lucide-react';
import ReactConfetti from 'react-confetti';
import AnimatedButton from '../ui/AnimatedButton';
import { formatNumber, formatScore, getScoreColor, getScoreLabel } from '../../utils/formatters';

/* ───────────────────────────────────────────────────────────
   Animated score gauge
   ─────────────────────────────────────────────────────────── */
function ScoreGauge({ score, size = 140 }) {
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = Math.PI * radius; // half circle
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size / 2 + 20 }}>
        <svg width={size} height={size / 2 + 10} className="overflow-visible">
          {/* Background arc */}
          <path
            d={`M ${strokeWidth / 2} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${size / 2}`}
            fill="none"
            stroke="var(--bg-tertiary)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          {/* Score arc */}
          <motion.path
            d={`M ${strokeWidth / 2} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${size / 2}`}
            fill="none"
            stroke={getScoreColor(score)}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.5, ease: 'easeOut', delay: 0.3 }}
          />
        </svg>
        {/* Score text */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-3xl font-bold"
            style={{ color: getScoreColor(score) }}
          >
            {formatScore(score)}
          </motion.div>
          <div className="text-xs text-[var(--text-secondary)]">{getScoreLabel(score)}</div>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────────────────────────────────────────
   Main ResultPanel
   ─────────────────────────────────────────────────────────── */
export default function ResultPanel({ result, onDownload, onReset }) {
  const [showConfetti, setShowConfetti] = useState(true);
  const [tablePage, setTablePage] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(false), 4000);
    return () => clearTimeout(timer);
  }, []);

  if (!result) return null;

  const preview = result.synthetic_data || [];
  const columns = result.columns || (preview.length > 0 ? Object.keys(preview[0]) : []);
  const quality = result.quality_metrics;
  const rowsPerPage = 5;
  const totalTablePages = Math.ceil(preview.length / rowsPerPage);
  const pageRows = preview.slice(tablePage * rowsPerPage, (tablePage + 1) * rowsPerPage);

  return (
    <motion.div
      initial={{ opacity: 0, y: 60 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 200, damping: 25 }}
      className="w-full max-w-5xl mx-auto space-y-8"
    >
      {/* Confetti */}
      {showConfetti && (
        <ReactConfetti
          recycle={false}
          numberOfPieces={300}
          gravity={0.15}
          colors={['#6C63FF', '#00D4FF', '#00FF88', '#FFB800']}
          style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 100, pointerEvents: 'none' }}
        />
      )}

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', delay: 0.2 }}
          className="w-16 h-16 rounded-2xl bg-[var(--accent-success)]/15 flex items-center justify-center mx-auto mb-4"
        >
          <Award size={32} className="text-[var(--accent-success)]" />
        </motion.div>
        <h2 className="text-2xl font-bold mb-1">Generation Complete!</h2>
        <p className="text-[var(--text-secondary)]">
          Successfully generated {formatNumber(result.num_rows_generated)} rows
        </p>
      </motion.div>

      {/* Stats Row */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        {[
          { label: 'Rows Generated', value: formatNumber(result.num_rows_generated), icon: Table },
          { label: 'Columns', value: columns.length, icon: TrendingUp },
          { label: 'Status', value: 'Complete', icon: Award },
          { label: 'Quality', value: quality ? formatScore(quality.overall_score) : 'N/A', icon: TrendingUp },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 + i * 0.1 }}
            className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-xl p-4 text-center"
          >
            <stat.icon size={18} className="text-[var(--accent-primary)] mx-auto mb-2" />
            <div className="text-xl font-bold text-[var(--text-primary)]">{stat.value}</div>
            <div className="text-xs text-[var(--text-secondary)]">{stat.label}</div>
          </motion.div>
        ))}
      </motion.div>

      {/* Quality Gauge (CTGAN only) */}
      {quality && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-2xl p-6"
        >
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Award size={18} className="text-[var(--accent-primary)]" />
            Quality Score
          </h3>
          <ScoreGauge score={quality.overall_score} />
        </motion.div>
      )}

      {/* Data Preview Table */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-2xl overflow-hidden"
      >
        <div className="p-4 border-b border-[var(--border-default)] flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2">
            <Table size={18} className="text-[var(--accent-primary)]" />
            Data Preview
          </h3>
          <span className="text-xs text-[var(--text-tertiary)]">
            Showing {pageRows.length} of {preview.length} preview rows
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border-default)]">
                {columns.map((col, i) => (
                  <motion.th
                    key={col}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.9 + i * 0.05 }}
                    className="text-left px-4 py-3 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider whitespace-nowrap"
                  >
                    {col}
                  </motion.th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageRows.map((row, ri) => (
                <motion.tr
                  key={ri}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 1.0 + ri * 0.06 }}
                  className="border-b border-[var(--border-default)] last:border-b-0 hover:bg-[var(--bg-tertiary)] transition-colors"
                >
                  {columns.map((col) => (
                    <td key={col} className="px-4 py-2.5 text-[var(--text-primary)] font-mono text-xs whitespace-nowrap">
                      {row[col] != null ? String(row[col]) : '—'}
                    </td>
                  ))}
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Table pagination */}
        {totalTablePages > 1 && (
          <div className="flex items-center justify-center gap-2 p-3 border-t border-[var(--border-default)]">
            <button
              onClick={() => setTablePage(p => Math.max(0, p - 1))}
              disabled={tablePage === 0}
              className="p-1 rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-30"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs text-[var(--text-secondary)]">
              {tablePage + 1} / {totalTablePages}
            </span>
            <button
              onClick={() => setTablePage(p => Math.min(totalTablePages - 1, p + 1))}
              disabled={tablePage >= totalTablePages - 1}
              className="p-1 rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-30"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </motion.div>

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2 }}
        className="flex flex-col sm:flex-row items-center justify-center gap-4"
      >
        <AnimatedButton
          onClick={onDownload}
          icon={Download}
          size="lg"
          variant="primary"
          className="min-w-[200px] animate-pulse-glow"
        >
          Download CSV
        </AnimatedButton>
        <AnimatedButton
          onClick={onReset}
          variant="secondary"
          size="lg"
        >
          Generate Another
        </AnimatedButton>
      </motion.div>
    </motion.div>
  );
}
