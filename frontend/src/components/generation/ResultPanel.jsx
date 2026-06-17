import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Download, Table, Award, TrendingUp, ChevronLeft, ChevronRight, ShieldCheck } from 'lucide-react';
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
  const privacy = quality?.privacy;
  const rowsPerPage = 5;
  const totalTablePages = Math.ceil(preview.length / rowsPerPage);
  const pageRows = preview.slice(tablePage * rowsPerPage, (tablePage + 1) * rowsPerPage);

  return (
    <motion.div
      initial={{ opacity: 0, y: 60 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 200, damping: 25 }}
      className="w-full max-w-7xl mx-auto space-y-12 pb-12"
    >
      {/* Confetti */}
      {showConfetti && (
        <ReactConfetti
          recycle={false}
          numberOfPieces={400}
          gravity={0.12}
          colors={['#6C63FF', '#00D4FF', '#00FF88', '#FFB800', '#FF4466']}
          style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 100, pointerEvents: 'none' }}
        />
      )}

      {/* Hero Result Section */}
      <div className="grid lg:grid-cols-5 gap-8 items-stretch">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-3 bg-gradient-to-br from-[var(--bg-secondary)] to-[var(--bg-tertiary)] border border-[var(--border-default)] rounded-[2.5rem] p-10 flex flex-col justify-center relative overflow-hidden shadow-2xl"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--accent-success)]/5 rounded-bl-full blur-3xl pointer-events-none" />
          
          <motion.div
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', delay: 0.3 }}
            className="w-24 h-24 rounded-3xl bg-[var(--accent-success)]/10 flex items-center justify-center mb-8 shadow-xl"
          >
            <Award size={48} className="text-[var(--accent-success)]" />
          </motion.div>
          
          <h2 className="text-4xl md:text-5xl font-black mb-4 leading-tight">
            Success!<br />
            <span className="gradient-text">Data is Ready.</span>
          </h2>
          <p className="text-[var(--text-secondary)] text-lg max-w-md font-medium leading-relaxed mb-10">
            We've successfully generated <span className="text-[var(--text-primary)] font-bold">{formatNumber(result.num_rows_generated)}</span> rows of high-fidelity synthetic data based on your requirements.
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            <AnimatedButton
              onClick={onDownload}
              icon={Download}
              size="lg"
              className="min-w-[220px] shadow-xl shadow-[var(--accent-primary)]/20"
            >
              Download CSV
            </AnimatedButton>
            <AnimatedButton
              onClick={onReset}
              variant="secondary"
              size="lg"
              className="min-w-[180px]"
            >
              Start New
            </AnimatedButton>
          </div>

          {privacy && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
              className="mt-8 p-4 rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.06] flex items-start gap-3"
            >
              <ShieldCheck size={18} className="text-emerald-300 shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-300">
                  Privacy {privacy.enabled ? 'Enabled' : 'Disabled'}
                </p>
                <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
                  {privacy.enabled
                    ? `${privacy.removed_count || 0} protected column${privacy.removed_count === 1 ? '' : 's'} removed before training.`
                    : 'The model trained with every uploaded column.'}
                </p>
                {privacy.removed_columns?.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {privacy.removed_columns.map((col) => (
                      <span key={col} className="px-2.5 py-1 rounded-lg bg-[var(--bg-primary)] border border-emerald-400/20 text-[10px] font-mono text-emerald-200">
                        {col}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* Quality Score Sidebar */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2 bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-[2.5rem] p-10 shadow-xl flex flex-col items-center justify-center text-center"
        >
          <h3 className="font-bold text-xs uppercase tracking-[0.2em] text-[var(--text-tertiary)] mb-8">
            Statistical Quality
          </h3>
          
          {quality ? (
            <>
              <ScoreGauge score={quality.overall_score} size={200} />
              <div className="mt-8 space-y-2">
                <p className="text-[var(--text-secondary)] text-sm max-w-[200px] font-medium leading-relaxed">
                  Based on statistical similarity and distribution matching metrics.
                </p>
                <div className="flex items-center justify-center gap-1.5 pt-2">
                  <span className="w-2 h-2 rounded-full bg-[var(--accent-success)] animate-pulse" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--accent-success)]">Verified Accuracy</span>
                </div>
              </div>
            </>
          ) : (
            <div className="py-12 flex flex-col items-center">
              <div className="w-16 h-16 rounded-full border-4 border-dashed border-[var(--border-default)] animate-spin-slow mb-6" />
              <p className="text-sm text-[var(--text-tertiary)] font-bold uppercase tracking-widest">Score N/A</p>
            </div>
          )}
        </motion.div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {[
          { label: 'Rows Generated', value: formatNumber(result.num_rows_generated), icon: Table, color: 'var(--accent-primary)' },
          { label: 'Feature Columns', value: columns.length, icon: TrendingUp, color: 'var(--accent-secondary)' },
          { label: 'Source Type', value: result.mode?.toUpperCase(), icon: Award, color: 'var(--accent-success)' },
          { label: 'Processing Time', value: 'Instant', icon: TrendingUp, color: 'var(--accent-warning)' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 + i * 0.1 }}
            className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-3xl p-6 hover:border-[var(--border-hover)] transition-all group"
          >
            <div className="w-10 h-10 rounded-xl mb-4 flex items-center justify-center group-hover:scale-110 transition-transform" style={{ background: `color-mix(in srgb, ${stat.color} 10%, transparent)` }}>
              <stat.icon size={20} style={{ color: stat.color }} />
            </div>
            <div className="text-2xl font-black text-[var(--text-primary)] font-mono">{stat.value}</div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary)] mt-1">{stat.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Preview Section */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9 }}
        className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-[2.5rem] overflow-hidden shadow-2xl"
      >
        <div className="px-10 py-6 border-b border-[var(--border-default)] flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[var(--bg-tertiary)]/30">
          <div>
            <h3 className="text-xl font-bold flex items-center gap-3">
              <Table size={24} className="text-[var(--accent-primary)]" />
              Interactive Preview
            </h3>
            <p className="text-xs text-[var(--text-tertiary)] mt-1 font-medium uppercase tracking-widest">
              Showing sample of generated records
            </p>
          </div>
          <div className="flex items-center gap-4 bg-[var(--bg-primary)]/50 px-4 py-2 rounded-2xl border border-[var(--border-default)] shadow-inner">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-tertiary)]">Page</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setTablePage(p => Math.max(0, p - 1))}
                disabled={tablePage === 0}
                className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] disabled:opacity-20 transition-all"
              >
                <ChevronLeft size={20} />
              </button>
              <span className="text-sm font-black font-mono px-2 text-[var(--accent-primary)]">
                {tablePage + 1}
              </span>
              <button
                onClick={() => setTablePage(p => Math.min(totalTablePages - 1, p + 1))}
                disabled={tablePage >= totalTablePages - 1}
                className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] disabled:opacity-20 transition-all"
              >
                <ChevronRight size={20} />
              </button>
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-tertiary)]">of {totalTablePages}</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[var(--bg-tertiary)]/20">
                {columns.map((col) => (
                  <th
                    key={col}
                    className="text-left px-8 py-4 text-[10px] font-black text-[var(--text-tertiary)] uppercase tracking-[0.15em] whitespace-nowrap border-b border-[var(--border-default)]"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-default)]">
              {pageRows.map((row, ri) => (
                <tr
                  key={ri}
                  className="hover:bg-[var(--accent-primary)]/[0.02] transition-colors"
                >
                  {columns.map((col) => (
                    <td key={col} className="px-8 py-4 text-[var(--text-primary)] font-mono text-xs whitespace-nowrap">
                      {row[col] != null ? (
                        <span className={typeof row[col] === 'number' ? 'text-[var(--accent-secondary)] font-bold' : ''}>
                          {String(row[col])}
                        </span>
                      ) : (
                        <span className="opacity-20 text-[var(--text-tertiary)]">—</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </motion.div>
  );
}
