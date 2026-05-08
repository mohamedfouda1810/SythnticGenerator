import { useState, useRef, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Clock, Home, LogIn, UserPlus, User, LogOut, Settings, Shield, Menu, X } from 'lucide-react';
import useAuthStore from '../../store/authStore';
import Avatar from '../ui/Avatar';

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuthStore();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setDropdownOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Close mobile on route change
  useEffect(() => { setMobileOpen(false); setDropdownOpen(false); }, [location.pathname]);

  const navLinks = [
    { to: '/', label: 'Home', icon: Home, show: true },
    { to: '/generate', label: 'Generate', icon: Sparkles, show: true },
    { to: '/history', label: 'History', icon: Clock, show: isAuthenticated },
  ];

  const isActive = (to) => location.pathname === to || (to !== '/' && location.pathname.startsWith(to));

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <motion.nav
      initial={{ y: -80 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', stiffness: 200, damping: 25 }}
      className="fixed top-0 left-0 right-0 z-50 glass-strong"
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <NavLink to="/" className="flex items-center gap-2.5 group">
          <motion.div
            animate={{ y: [0, -4, 0] }}
            transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
          >
            <Sparkles size={24} className="text-[var(--accent-primary)] group-hover:text-[var(--accent-secondary)] transition-colors" />
          </motion.div>
          <span className="text-lg font-bold gradient-text">SynthGen</span>
        </NavLink>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.filter(l => l.show).map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className="relative px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              {isActive(to) && (
                <motion.div
                  layoutId="nav-indicator"
                  className="absolute inset-0 bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/30 rounded-lg"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <span className={`relative z-10 flex items-center gap-2 ${isActive(to) ? 'text-[var(--accent-primary)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}>
                <Icon size={16} />
                {label}
              </span>
            </NavLink>
          ))}

          {isAuthenticated && user?.role === 'admin' && (
            <NavLink to="/admin" className="relative px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              {isActive('/admin') && (
                <motion.div
                  layoutId="nav-indicator"
                  className="absolute inset-0 bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/30 rounded-lg"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <span className={`relative z-10 flex items-center gap-2 ${isActive('/admin') ? 'text-[var(--accent-primary)]' : 'text-amber-400 hover:text-amber-300'}`}>
                <Shield size={16} />
                Admin
              </span>
            </NavLink>
          )}
        </div>

        {/* Right side */}
        <div className="hidden md:flex items-center gap-3">
          {isAuthenticated ? (
            <div className="relative" ref={dropdownRef}>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-[var(--bg-tertiary)] transition-colors"
              >
                <Avatar name={user?.username} url={user?.avatar_url} size="sm" />
                <span className="text-sm font-medium max-w-[100px] truncate">{user?.username}</span>
              </motion.button>

              <AnimatePresence>
                {dropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-2 w-48 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-default)] shadow-xl overflow-hidden"
                  >
                    <NavLink to="/profile" className="flex items-center gap-2 px-4 py-3 text-sm hover:bg-[var(--bg-tertiary)] transition-colors">
                      <User size={16} className="text-[var(--text-secondary)]" />
                      Profile
                    </NavLink>
                    <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-3 text-sm w-full hover:bg-[var(--bg-tertiary)] transition-colors text-[var(--accent-error)]">
                      <LogOut size={16} />
                      Logout
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <>
              <NavLink to="/login" className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-default)] hover:border-[var(--border-hover)] transition-colors">
                <LogIn size={16} />
                Login
              </NavLink>
              <NavLink to="/register" className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-primary-light)] transition-colors">
                <UserPlus size={16} />
                Register
              </NavLink>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden p-2 rounded-lg hover:bg-[var(--bg-tertiary)]">
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden overflow-hidden bg-[var(--bg-secondary)] border-t border-[var(--border-default)]"
          >
            <div className="p-4 space-y-2">
              {navLinks.filter(l => l.show).map(({ to, label, icon: Icon }) => (
                <NavLink key={to} to={to} className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium ${isActive(to) ? 'bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]' : 'text-[var(--text-secondary)]'}`}>
                  <Icon size={18} />
                  {label}
                </NavLink>
              ))}
              {isAuthenticated && user?.role === 'admin' && (
                <NavLink to="/admin" className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-amber-400">
                  <Shield size={18} />
                  Admin
                </NavLink>
              )}
              <div className="pt-2 border-t border-[var(--border-default)]">
                {isAuthenticated ? (
                  <>
                    <NavLink to="/profile" className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm">
                      <User size={18} className="text-[var(--text-secondary)]" />
                      Profile
                    </NavLink>
                    <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm w-full text-[var(--accent-error)]">
                      <LogOut size={18} />
                      Logout
                    </button>
                  </>
                ) : (
                  <>
                    <NavLink to="/login" className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm">
                      <LogIn size={18} />
                      Login
                    </NavLink>
                    <NavLink to="/register" className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm text-[var(--accent-primary)]">
                      <UserPlus size={18} />
                      Register
                    </NavLink>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
