import { motion } from 'framer-motion';
import { NavLink, Routes, Route, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, Activity, AlertTriangle, HardDrive } from 'lucide-react';
import OverviewPanel from './panels/OverviewPanel';
import UsersPanel from './panels/UsersPanel';
import LogsPanel from './panels/LogsPanel';
import ErrorsPanel from './panels/ErrorsPanel';
import StoragePanel from './panels/StoragePanel';

const sidebarLinks = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/users', label: 'Users', icon: Users },
  { to: '/admin/logs', label: 'Activity Logs', icon: Activity },
  { to: '/admin/errors', label: 'Error Reports', icon: AlertTriangle },
  { to: '/admin/storage', label: 'Storage', icon: HardDrive },
];

export default function AdminDashboard() {
  const location = useLocation();

  return (
    <div className="flex" style={{ minHeight: '100vh', paddingTop: '64px' }}>
      {/* Sidebar */}
      <motion.aside
        initial={{ x: -240 }}
        animate={{ x: 0 }}
        style={{ 
          width: '240px', 
          flexShrink: 0,
          position: 'sticky', 
          top: '64px', 
          height: 'calc(100vh - 64px)',
          overflowY: 'auto',
          background: 'var(--bg-secondary)',
          borderRight: '1px solid var(--border-default)',
          zIndex: 40
        }}
        className="hidden lg:block"
      >
        <div className="p-4 space-y-1">
          <h3 className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-3 px-3">Admin Panel</h3>
          {sidebarLinks.map(({ to, label, icon: Icon, end }) => {
            const isActive = end ? location.pathname === to : location.pathname.startsWith(to);
            return (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
                }`}
              >
                <Icon size={18} />
                {label}
              </NavLink>
            );
          })}
        </div>
      </motion.aside>

      {/* Mobile nav tabs */}
      <div className="lg:hidden fixed top-16 left-0 right-0 z-40 bg-[var(--bg-secondary)] border-b border-[var(--border-default)] flex overflow-x-auto">
        {sidebarLinks.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-2 px-4 py-3 text-xs font-medium whitespace-nowrap border-b-2 ${
                isActive
                  ? 'border-[var(--accent-primary)] text-[var(--accent-primary)]'
                  : 'border-transparent text-[var(--text-secondary)]'
              }`
            }
          >
            <Icon size={14} />
            {label}
          </NavLink>
        ))}
      </div>

      {/* Main content */}
      <main 
        style={{ 
          flex: 1, 
          overflowX: 'hidden', 
          padding: '32px',
          background: 'rgba(255,255,255,0.01)'
        }} 
        className="mt-12 lg:mt-0"
      >
        <div className="max-w-7xl mx-auto">
          <Routes>
            <Route index element={<OverviewPanel />} />
            <Route path="users" element={<UsersPanel />} />
            <Route path="logs" element={<LogsPanel />} />
            <Route path="errors" element={<ErrorsPanel />} />
            <Route path="storage" element={<StoragePanel />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}
