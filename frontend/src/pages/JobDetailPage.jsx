import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Download, Clock, Calendar, Hash, FileSpreadsheet,
  CheckCircle2, XCircle, Loader2, Cpu, Sparkles, Timer, Columns3, BarChart3
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getJobDetails, downloadResult } from '../services/api';
import AnimatedButton from '../components/ui/AnimatedButton';

const STATUS_CONFIG = {
  completed: { icon: CheckCircle2, color: 'var(--accent-success)', label: 'Completed' },
  failed:    { icon: XCircle,      color: 'var(--accent-error)',   label: 'Failed' },
  processing:{ icon: Loader2,      color: 'var(--accent-warning)', label: 'Processing' },
  pending:   { icon: Clock,        color: 'var(--text-secondary)', label: 'Pending' },
};

function QualityGauge({ score }) {
  if (score == null) return null;

  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? 'var(--accent-success)' : score >= 60 ? 'var(--accent-warning)' : 'var(--accent-error)';

  return (
    <div className="flex flex-col items-center">
      <svg width="160" height="160" viewBox="0 0 160 160">
        <circle cx="80" cy="80" r={radius} fill="none" stroke="var(--bg-tertiary)" strokeWidth="10" />
        <motion.circle
          cx="80" cy="80" r={radius} fill="none" stroke={color} strokeWidth="10"
          strokeLinecap="round" strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
          transform="rotate(-90 80 80)"
        />
        <text x="80" y="75" textAnchor="middle" fill="var(--text-primary)" fontSize="28" fontWeight="700">{Math.round(score)}</text>
        <text x="80" y="95" textAnchor="middle" fill="var(--text-secondary)" fontSize="12">Quality</text>
      </svg>
    </div>
  );
}

export default function JobDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    getJobDetails(id).then(({ data, error }) => {
      if (error) { toast.error(error); navigate('/history'); return; }
      setJob(data);
      setLoading(false);
    });
  }, [id, navigate]);

  const handleDownload = async () => {
    if (!job?.download_token) { toast.error('Download token expired'); return; }
    setDownloading(true);
    const { error } = await downloadResult(job.download_token);
    setDownloading(false);
    if (error) toast.error(error);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-20">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}>
          <Loader2 size={32} className="text-[var(--accent-primary)]" />
        </motion.div>
      </div>
    );
  }

  if (!job) return null;

  const statusConf = STATUS_CONFIG[job.status] || STATUS_CONFIG.pending;
  const StatusIcon = statusConf.icon;
  const isCTGAN = job.mode === 'ctgan';
  const privacy = job.quality_metrics?.privacy;

  return (
    <div className="page-content pt-24 pb-12 px-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-4 mb-8">
          <motion.button whileHover={{ x: -3 }} onClick={() => navigate('/history')} className="p-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-default)] hover:border-[var(--border-hover)] transition-colors">
            <ArrowLeft size={18} />
          </motion.button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">Job Details</h1>
            <p className="text-sm text-[var(--text-secondary)] font-mono">{job.id}</p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl" style={{ background: `color-mix(in srgb, ${statusConf.color} 15%, transparent)` }}>
            <StatusIcon size={16} style={{ color: statusConf.color }} className={job.status === 'processing' ? 'animate-spin' : ''} />
            <span className="text-sm font-medium" style={{ color: statusConf.color }}>{statusConf.label}</span>
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-[1fr_280px] gap-6">
          {/* Main content */}
          <div className="space-y-6">
            {/* Info Grid */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Mode', value: isCTGAN ? 'CTGAN' : 'Mimesis', icon: isCTGAN ? Cpu : Sparkles, color: isCTGAN ? 'var(--accent-primary)' : 'var(--accent-secondary)' },
                { label: 'Rows Generated', value: job.num_rows_generated?.toLocaleString() || '—', icon: Hash, color: 'var(--accent-success)' },
                { label: 'Duration', value: job.generation_time_seconds ? `${job.generation_time_seconds}s` : '—', icon: Timer, color: 'var(--accent-warning)' },
                { label: 'Columns', value: job.columns_generated?.length || '—', icon: Columns3, color: 'var(--accent-primary)' },
              ].map((item) => (
                <div key={item.label} className="p-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-default)]">
                  <div className="flex items-center gap-2 mb-2">
                    <item.icon size={14} style={{ color: item.color }} />
                    <span className="text-xs text-[var(--text-secondary)]">{item.label}</span>
                  </div>
                  <p className="text-lg font-bold">{item.value}</p>
                </div>
              ))}
            </motion.div>

            {/* Columns */}
            {privacy && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }} className="p-6 rounded-2xl bg-emerald-500/[0.05] border border-emerald-400/20">
                <h3 className="font-semibold mb-2 flex items-center gap-2 text-emerald-200">
                  <CheckCircle2 size={16} />
                  Privacy Protection {privacy.enabled ? 'Enabled' : 'Disabled'}
                </h3>
                <p className="text-sm text-[var(--text-secondary)]">
                  {privacy.enabled
                    ? `${privacy.removed_count || 0} uploaded column${privacy.removed_count === 1 ? '' : 's'} removed before training and export.`
                    : 'All uploaded columns were used for CTGAN training.'}
                </p>
                {privacy.removed_columns?.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    {privacy.removed_columns.map((col) => (
                      <span key={col} className="px-3 py-1.5 rounded-lg bg-[var(--bg-primary)] border border-emerald-400/20 text-sm font-mono text-emerald-200">
                        {col}
                      </span>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* Columns */}
            {job.columns_generated && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="p-6 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-default)]">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Columns3 size={16} className="text-[var(--accent-primary)]" />
                  Generated Columns
                </h3>
                <div className="flex flex-wrap gap-2">
                  {job.columns_generated.map((col) => (
                    <span key={col} className="px-3 py-1.5 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-default)] text-sm font-mono text-[var(--text-secondary)]">
                      {col}
                    </span>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Data Preview */}
            {job.synthetic_data_sample && job.synthetic_data_sample.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="p-6 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-default)]">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <FileSpreadsheet size={16} className="text-[var(--accent-secondary)]" />
                  Data Preview (first {job.synthetic_data_sample.length} rows)
                </h3>
                <div className="overflow-x-auto rounded-xl border border-[var(--border-default)]">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-[var(--bg-tertiary)]">
                        {Object.keys(job.synthetic_data_sample[0]).map((col) => (
                          <th key={col} className="px-4 py-3 text-left font-medium text-[var(--text-secondary)] whitespace-nowrap font-mono text-xs">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {job.synthetic_data_sample.slice(0, 10).map((row, i) => (
                        <tr key={i} className="border-t border-[var(--border-default)] hover:bg-[var(--bg-tertiary)]/50 transition-colors">
                          {Object.values(row).map((val, j) => (
                            <td key={j} className="px-4 py-2.5 whitespace-nowrap text-[var(--text-primary)] font-mono text-xs">
                              {val === null ? <span className="text-[var(--text-tertiary)]">null</span> : String(val).slice(0, 40)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {/* Schema (Mimesis) */}
            {job.schema_used && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="p-6 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-default)]">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <BarChart3 size={16} className="text-[var(--accent-primary)]" />
                  Schema Used
                </h3>
                <pre className="p-4 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-default)] overflow-x-auto text-sm text-[var(--text-secondary)] font-mono leading-relaxed">
                  {JSON.stringify(job.schema_used, null, 2)}
                </pre>
              </motion.div>
            )}

            {/* Error */}
            {job.error_message && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-6 rounded-2xl bg-[var(--accent-error)]/5 border-2 border-[var(--accent-error)]/30">
                <h3 className="font-semibold text-[var(--accent-error)] mb-2 flex items-center gap-2">
                  <XCircle size={16} /> Error Details
                </h3>
                <p className="text-sm text-[var(--text-secondary)] font-mono">{job.error_message}</p>
              </motion.div>
            )}
          </div>

          {/* Right sidebar */}
          <div className="space-y-6">
            {/* Quality Gauge */}
            {job.quality_score != null && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="p-6 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-default)]">
                <h3 className="font-semibold mb-4 text-center">Quality Score</h3>
                <QualityGauge score={job.quality_score} />
              </motion.div>
            )}

            {/* Download */}
            {job.download_token && job.status === 'completed' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                <AnimatedButton onClick={handleDownload} loading={downloading} icon={Download} className="w-full" size="lg">
                  Download CSV
                </AnimatedButton>
              </motion.div>
            )}

            {/* Quality Details */}
            {job.quality_metrics && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="p-6 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-default)]">
                <h3 className="font-semibold mb-3 text-sm">Quality Details</h3>
                {job.quality_metrics.column_metrics ? (
                  <div className="space-y-3">
                    <div className="text-xs text-[var(--text-secondary)] space-y-1">
                      <div className="flex justify-between">
                        <span>Correlation diff</span>
                        <span className="font-mono">{job.quality_metrics.correlation_difference?.toFixed(3) || '—'}</span>
                      </div>
                    </div>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {job.quality_metrics.column_metrics.map((m, i) => (
                        <div key={m.column || i} className="flex items-center justify-between text-xs p-2 rounded-lg bg-[var(--bg-tertiary)]">
                          <span className="font-mono text-[var(--text-secondary)]">{m.column}</span>
                          <span className="font-mono" style={{ color: m.similarity >= 80 ? 'var(--accent-success)' : m.similarity >= 50 ? 'var(--accent-warning)' : 'var(--accent-error)' }}>
                            {(m.similarity ?? 0).toFixed(0)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : job.quality_metrics.details ? (
                  <div className="space-y-2 text-xs text-[var(--text-secondary)]">
                    <div className="flex justify-between">
                      <span>Method</span>
                      <span className="font-mono">{job.quality_metrics.method}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Null rate</span>
                      <span className="font-mono">{job.quality_metrics.details.null_rate}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Type accuracy</span>
                      <span className="font-mono">{job.quality_metrics.details.type_accuracy}%</span>
                    </div>
                    {job.quality_metrics.details.deductions?.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-[var(--border-default)]">
                        <p className="text-[var(--accent-warning)] mb-1">Deductions:</p>
                        {job.quality_metrics.details.deductions.map((d, i) => (
                          <p key={i} className="text-[var(--text-tertiary)] font-mono text-[11px]">• {d}</p>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-[var(--text-tertiary)]">{job.quality_metrics.summary || 'No detailed metrics'}</p>
                )}
              </motion.div>
            )}

            {/* Timestamps */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="p-6 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-default)]">
              <h3 className="font-semibold mb-3 text-sm">Timeline</h3>
              <div className="space-y-3 text-xs text-[var(--text-secondary)]">
                <div className="flex items-center gap-2">
                  <Calendar size={12} />
                  <span>Created: {new Date(job.created_at).toLocaleString()}</span>
                </div>
                {job.completed_at && (
                  <div className="flex items-center gap-2">
                    <Clock size={12} />
                    <span>Completed: {new Date(job.completed_at).toLocaleString()}</span>
                  </div>
                )}
                {job.file_name && (
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet size={12} />
                    <span>Source: {job.file_name}</span>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
