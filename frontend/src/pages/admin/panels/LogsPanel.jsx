import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { getAdminLogs } from '../../../services/api';

export default function LogsPanel() {
  const [logs, setLogs] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    setLoading(true);
    const params = { page, limit: 50 };
    if (filter) params.action = filter;
    const { data } = await getAdminLogs(params);
    if (data) {
      setLogs(data.logs);
      setTotal(data.total);
      setPages(data.pages);
    }
    setLoading(false);
  };

  useEffect(() => { fetchLogs(); }, [page, filter]);

  const actions = ['login', 'logout', 'register', 'generate_ctgan', 'generate_mimesis', 'block_user', 'delete_user'];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Activity Logs</h1>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => { setFilter(''); setPage(1); }} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${!filter ? 'bg-[var(--accent-primary)] text-white' : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]'}`}>All</button>
        {actions.map(a => (
          <button key={a} onClick={() => { setFilter(a); setPage(1); }} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${filter === a ? 'bg-[var(--accent-primary)] text-white' : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]'}`}>
            {a.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-default)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border-default)]">
                <th className="text-left px-4 py-3 font-medium text-[var(--text-secondary)]">Timestamp</th>
                <th className="text-left px-4 py-3 font-medium text-[var(--text-secondary)]">Action</th>
                <th className="text-left px-4 py-3 font-medium text-[var(--text-secondary)]">User</th>
                <th className="text-left px-4 py-3 font-medium text-[var(--text-secondary)]">Details</th>
                <th className="text-left px-4 py-3 font-medium text-[var(--text-secondary)]">IP</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-[var(--border-default)]">
                    <td colSpan={5} className="px-4 py-3"><div className="h-4 bg-[var(--bg-tertiary)] rounded animate-pulse" /></td>
                  </tr>
                ))
              ) : logs.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-[var(--text-secondary)]">No logs found</td></tr>
              ) : (
                logs.map((l) => (
                  <motion.tr key={l.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="border-b border-[var(--border-default)] hover:bg-[var(--bg-tertiary)]/50">
                    <td className="px-4 py-3 text-xs text-[var(--text-secondary)] whitespace-nowrap">{new Date(l.timestamp).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]">
                        {l.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-[var(--text-secondary)]">{l.user_id?.slice(0, 8) || '—'}</td>
                    <td className="px-4 py-3 text-xs text-[var(--text-secondary)] max-w-xs truncate">{l.details ? JSON.stringify(l.details) : '—'}</td>
                    <td className="px-4 py-3 text-xs text-[var(--text-tertiary)]">{l.ip_address || '—'}</td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--border-default)]">
            <p className="text-xs text-[var(--text-secondary)]">{total} total logs</p>
            <div className="flex gap-1">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1.5 rounded-lg text-xs bg-[var(--bg-tertiary)] disabled:opacity-30">Prev</button>
              <span className="px-3 py-1.5 text-xs">{page}/{pages}</span>
              <button disabled={page >= pages} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 rounded-lg text-xs bg-[var(--bg-tertiary)] disabled:opacity-30">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
