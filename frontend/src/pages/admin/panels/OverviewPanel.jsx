import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Zap, CheckCircle, XCircle, TrendingUp } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { getAdminStats } from '../../../services/api';

const COLORS = ['var(--accent-primary)', 'var(--accent-secondary)'];

export default function OverviewPanel() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAdminStats().then(({ data }) => { if (data) setStats(data); setLoading(false); });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <motion.div className="w-8 h-8 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full" animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }} />
      </div>
    );
  }

  if (!stats) return <p className="text-[var(--text-secondary)]">Failed to load stats</p>;

  const cards = [
    { label: 'Total Users', value: stats.total_users, icon: Users, color: '#3B82F6' },
    { label: 'Total Generations', value: stats.total_generations, icon: Zap, color: '#A855F7' },
    { label: 'Completed', value: stats.completed_count, icon: CheckCircle, color: '#22C55E' },
    { label: 'Failed', value: stats.failed_count, icon: XCircle, color: '#EF4444' },
  ];

  const pieData = [
    { name: 'CTGAN', value: stats.ctgan_count || 0 },
    { name: 'Mimesis', value: stats.mimesis_count || 0 },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard Overview</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c, i) => (
          <motion.div
            key={c.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="p-5 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-default)]"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `${c.color}20` }}>
                <c.icon size={20} style={{ color: c.color }} />
              </div>
            </div>
            <p className="text-3xl font-bold">{c.value}</p>
            <p className="text-sm text-[var(--text-secondary)]">{c.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Mode distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="p-6 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-default)]"
        >
          <h3 className="text-lg font-semibold mb-4">Mode Distribution</h3>
          {pieData.length > 0 ? (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((_, idx) => (
                      <Cell key={idx} fill={idx === 0 ? '#A855F7' : '#00D4FF'} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border-default)',
                      borderRadius: '8px',
                      color: 'var(--text-primary)',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex justify-center gap-6 mt-2">
                {pieData.map((d, i) => (
                  <div key={d.name} className="flex items-center gap-2 text-sm">
                    <div className="w-3 h-3 rounded-full" style={{ background: i === 0 ? '#A855F7' : '#00D4FF' }} />
                    {d.name}: {d.value}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-[var(--text-secondary)] text-sm">No generation data yet</p>
          )}
        </motion.div>

        {/* Quick stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="p-6 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-default)]"
        >
          <h3 className="text-lg font-semibold mb-4">Quick Stats</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-[var(--border-default)]">
              <span className="text-[var(--text-secondary)] text-sm">Active Users</span>
              <span className="font-semibold">{stats.active_users}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-[var(--border-default)]">
              <span className="text-[var(--text-secondary)] text-sm">Blocked Users</span>
              <span className="font-semibold text-[var(--accent-error)]">{stats.blocked_users}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-[var(--border-default)]">
              <span className="text-[var(--text-secondary)] text-sm">Today's Generations</span>
              <span className="font-semibold">{stats.generations_today}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-[var(--border-default)]">
              <span className="text-[var(--text-secondary)] text-sm">This Week</span>
              <span className="font-semibold">{stats.generations_this_week}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-[var(--text-secondary)] text-sm">Avg Quality Score</span>
              <span className="font-semibold text-[var(--accent-success)]">{stats.avg_quality_score ?? 'N/A'}</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Top users */}
      {stats.top_users?.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="p-6 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-default)]"
        >
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <TrendingUp size={20} className="text-[var(--accent-primary)]" />
            Top Users
          </h3>
          <div className="space-y-3">
            {stats.top_users.map((u, i) => (
              <div key={u.username} className="flex items-center gap-3">
                <span className="w-6 text-center text-sm font-bold text-[var(--text-tertiary)]">#{i + 1}</span>
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium">{u.username}</span>
                    <span className="text-xs text-[var(--text-secondary)]">{u.generation_count} generations</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(u.generation_count / (stats.top_users[0]?.generation_count || 1)) * 100}%` }}
                      transition={{ delay: 0.8 + i * 0.1, duration: 0.5 }}
                      className="h-full rounded-full bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)]"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
