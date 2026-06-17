import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import { getAdminErrors } from '../../../services/api';

export default function ErrorsPanel() {
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  useEffect(() => {
    getAdminErrors(page).then(({ data }) => {
      if (data) { setErrors(data.errors); setPages(data.pages); }
      setLoading(false);
    });
  }, [page]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Error Reports</h1>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 bg-[var(--bg-tertiary)] rounded-xl animate-pulse" />
          ))}
        </div>
      ) : errors.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle size={28} className="text-green-400" />
          </div>
          <p className="text-lg font-medium text-[var(--text-secondary)]">No errors found</p>
          <p className="text-sm text-[var(--text-tertiary)]">All generation jobs completed successfully</p>
        </div>
      ) : (
        <div className="space-y-3">
          {errors.map((err) => (
            <motion.div
              key={err.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-red-500/20"
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <AlertTriangle size={16} className="text-red-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-500/15 text-red-400">{err.mode}</span>
                    <span className="text-xs text-[var(--text-tertiary)]">{err.created_at ? new Date(err.created_at).toLocaleString() : ''}</span>
                  </div>
                  <p className="text-sm text-[var(--text-primary)] font-mono break-all">{err.error_message || 'Unknown error'}</p>
                  <p className="text-xs text-[var(--text-tertiary)] mt-1">Job ID: {err.id?.slice(0, 8)}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {pages > 1 && (
        <div className="flex justify-center gap-2">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-4 py-2 rounded-lg text-sm bg-[var(--bg-tertiary)] disabled:opacity-30">Prev</button>
          <span className="px-4 py-2 text-sm">{page}/{pages}</span>
          <button disabled={page >= pages} onClick={() => setPage(p => p + 1)} className="px-4 py-2 rounded-lg text-sm bg-[var(--bg-tertiary)] disabled:opacity-30">Next</button>
        </div>
      )}
    </div>
  );
}
