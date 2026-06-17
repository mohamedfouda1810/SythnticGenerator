import { motion } from 'framer-motion';
import { Clock, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { useHistory } from '../hooks/useHistory';
import HistoryTable from '../components/history/HistoryTable';
import AnimatedButton from '../components/ui/AnimatedButton';

const filterOptions = [
  { key: 'all', label: 'All' },
  { key: 'ctgan', label: 'CTGAN' },
  { key: 'mimesis', label: 'Mimesis' },
  { key: 'completed', label: 'Completed' },
  { key: 'failed', label: 'Failed' },
];

export default function HistoryPage() {
  const {
    jobs, loading, page, totalPages, total,
    filter, setFilter,
    deleteJob, goToPage, refresh,
  } = useHistory();

  return (
    <div className="page-content pt-24 pb-20 px-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6 mb-12"
        >
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/20 mb-4">
              <Clock size={14} className="text-[var(--accent-primary)]" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--accent-primary)]">Database Records</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black flex items-center gap-4">
              Generation History
            </h1>
            <p className="text-[var(--text-secondary)] mt-2 font-medium">
              You have generated <span className="text-[var(--text-primary)] font-bold">{total}</span> synthetic dataset{total !== 1 ? 's' : ''} in total.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <AnimatedButton
              onClick={refresh}
              variant="secondary"
              size="md"
              icon={RefreshCw}
              className="bg-[var(--bg-secondary)]"
            >
              Sync History
            </AnimatedButton>
          </div>
        </motion.div>

        {/* Filters and Search (Placeholder for more complex logic) */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 p-6 rounded-3xl bg-[var(--bg-secondary)] border border-[var(--border-default)]"
        >
          <div className="flex flex-wrap gap-2">
            {filterOptions.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-5 py-2 rounded-xl text-sm font-bold transition-all duration-300 ${
                  filter === f.key
                    ? 'bg-[var(--accent-primary)] text-white shadow-lg shadow-[var(--accent-primary)]/25'
                    : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="text-xs font-bold text-[var(--text-tertiary)] uppercase tracking-widest">
            Showing Page {page} of {totalPages || 1}
          </div>
        </motion.div>

        {/* Table */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <HistoryTable jobs={jobs} onDelete={deleteJob} loading={loading} />
        </motion.div>

        {/* Pagination */}
        {totalPages > 1 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex items-center justify-center gap-4 mt-8"
          >
            <AnimatedButton
              onClick={() => goToPage(page - 1)}
              disabled={page <= 1}
              variant="secondary"
              size="sm"
              icon={ChevronLeft}
            >
              Previous
            </AnimatedButton>
            <span className="text-sm text-[var(--text-secondary)]">
              Page {page} of {totalPages}
            </span>
            <AnimatedButton
              onClick={() => goToPage(page + 1)}
              disabled={page >= totalPages}
              variant="secondary"
              size="sm"
              icon={ChevronRight}
            >
              Next
            </AnimatedButton>
          </motion.div>
        )}
      </div>
    </div>
  );
}
