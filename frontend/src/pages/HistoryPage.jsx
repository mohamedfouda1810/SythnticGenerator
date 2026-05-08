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
    <div className="min-h-screen pt-24 pb-20 px-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8"
        >
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Clock size={28} className="text-[var(--accent-primary)]" />
              Generation History
            </h1>
            <p className="text-[var(--text-secondary)] mt-1">
              {total} total generation{total !== 1 ? 's' : ''}
            </p>
          </div>
          <AnimatedButton
            onClick={refresh}
            variant="secondary"
            size="sm"
            icon={RefreshCw}
          >
            Refresh
          </AnimatedButton>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-wrap gap-2 mb-6"
        >
          {filterOptions.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                filter === f.key
                  ? 'bg-[var(--accent-primary)] text-white'
                  : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-[var(--border-default)] hover:border-[var(--border-hover)] hover:text-[var(--text-primary)]'
              }`}
            >
              {f.label}
            </button>
          ))}
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
