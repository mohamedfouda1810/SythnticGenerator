import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { NavLink, Routes, Route, useLocation, Navigate } from 'react-router-dom';
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
    <div className="min-h-screen pt-16 flex">
      {/* Sidebar */}
      <motion.aside
        initial={{ x: -240 }}
        animate={{ x: 0 }}
        className="hidden lg:block w-60 fixed top-16 bottom-0 bg-[var(--bg-secondary)] border-r border-[var(--border-default)] overflow-y-auto"
      >
        <div className="p-4 space-y-1">
          <h3 className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-3 px-3">Admin Panel</h3>
          {sidebarLinks.map(({ to, label, icon: Icon, end }) => {
            const active = end ? location.pathname === to : location.pathname.startsWith(to) && location.pathname !== '/admin' || (end && location.pathname === to);
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
      <main className="flex-1 lg:ml-60 p-6 pt-8 lg:pt-6 mt-12 lg:mt-0">
        <Routes>
          <Route index element={<OverviewPanel />} />
          <Route path="users" element={<UsersPanel />} />
          <Route path="logs" element={<LogsPanel />} />
          <Route path="errors" element={<ErrorsPanel />} />
          <Route path="storage" element={<StoragePanel />} />
        </Routes>
      </main>
    </div>
  );
}
