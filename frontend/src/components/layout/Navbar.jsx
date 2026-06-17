import { useState, useRef, useEffect } from 'react';
import { NavLink, useLocation, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Clock, Home, User, LogOut, Shield, Menu, X, ChevronDown, Rocket } from 'lucide-react';
import useAuthStore from '../../store/authStore';
import Avatar from '../ui/Avatar';

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuthStore();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setDropdownOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setMobileOpen(false);
      setDropdownOpen(false);
    });
    return () => cancelAnimationFrame(frame);
  }, [location.pathname]);

  const navLinks = [
    { to: '/', label: 'Home', icon: Home, show: true },
    { to: '/generate', label: 'Engine', icon: Sparkles, show: true },
    { to: '/history', label: 'History', icon: Clock, show: isAuthenticated },
  ];

  const isActive = (to) => location.pathname === to || (to !== '/' && location.pathname.startsWith(to));

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', stiffness: 180, damping: 22 }}
      className={`fixed top-0 left-0 right-0 z-[var(--z-navbar)] transition-all duration-500 ${
        scrolled ? 'py-3' : 'py-6'
      }`}
    >
      <div className="container-xl">
        <motion.div
          layout
          className={`relative glass-morphism-strong rounded-[2rem] px-5 md:px-7 h-16 md:h-18 flex items-center justify-between transition-all duration-500 shadow-2xl ${
          scrolled 
            ? 'border-[var(--accent-primary)]/30 bg-[var(--bg-secondary)]/86 backdrop-blur-2xl shadow-[0_18px_70px_rgba(0,0,0,0.35)]' 
            : 'border-[var(--border-default)] bg-[var(--bg-primary)]/46 backdrop-blur-xl shadow-none'
        }`}
        >
          <motion.div
            aria-hidden
            animate={{ x: ['-120%', '120%'] }}
            transition={{ duration: 7, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/[0.04] to-transparent pointer-events-none"
          />
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <motion.div
              whileHover={{ rotate: 12, scale: 1.08 }}
              whileTap={{ scale: 0.96 }}
              className="relative w-9 h-9 md:w-11 md:h-11 bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] rounded-xl flex items-center justify-center shadow-lg shadow-[var(--accent-primary)]/20"
            >
              <motion.span
                className="absolute inset-0 rounded-xl border border-white/30"
                animate={{ opacity: [0.25, 0.8, 0.25], scale: [1, 1.08, 1] }}
                transition={{ duration: 2.6, repeat: Infinity }}
              />
              <Sparkles size={20} className="text-white" />
            </motion.div>
            <div className="flex flex-col">
              <span className="text-xl font-black tracking-tighter leading-none gradient-text">SynthGen</span>
              <span className="text-[9px] font-black uppercase tracking-[0.25em] text-[var(--accent-primary)] mt-0.5">AI Engine</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-2 bg-[var(--bg-tertiary)]/55 p-1.5 rounded-2xl border border-[var(--border-default)] shadow-inner">
            {navLinks.filter(l => l.show).map(({ to, label, icon: Icon }) => (
              <NavLink 
                key={to} 
                to={to} 
                className={({ isActive }) => `relative px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${
                  isActive ? 'text-[var(--text-primary)]' : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-white/5'
                }`}
              >
                {isActive(to) && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute inset-0 bg-gradient-to-r from-[var(--accent-primary)]/18 to-[var(--accent-secondary)]/12 border border-[var(--border-bright)] shadow-[0_0_24px_rgba(99,102,241,0.16)] rounded-xl"
                    transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-2.5">
                  <Icon size={18} />
                  {label}
                </span>
              </NavLink>
            ))}
          </div>

          {/* Right Section */}
          <div className="hidden lg:flex items-center gap-4">
            {isAuthenticated ? (
              <div className="relative" ref={dropdownRef}>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-4 pl-2 pr-4 py-2 rounded-2xl bg-[var(--bg-tertiary)] border border-[var(--border-bright)] hover:border-[var(--accent-primary)]/50 transition-all group"
                >
                  <Avatar name={user?.username} url={user?.avatar_url} size="sm" />
                  <div className="text-left leading-none">
                    <span className="block text-sm font-black max-w-[100px] truncate">{user?.username}</span>
                    <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-widest mt-1">{user?.role}</span>
                  </div>
                  <ChevronDown size={16} className={`text-[var(--text-tertiary)] transition-transform duration-300 ${dropdownOpen ? 'rotate-180' : ''}`} />
                </motion.button>

                <AnimatePresence>
                  {dropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 15, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 15, scale: 0.95 }}
                      className="absolute right-0 mt-4 w-60 rounded-3xl glass-morphism-strong border border-[var(--border-bright)] shadow-2xl p-2 z-[1100]"
                    >
                      <Link to="/profile" className="flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-white/5 transition-colors text-sm font-bold">
                        <User size={18} className="text-[var(--accent-primary)]" />
                        Manage Profile
                      </Link>
                      {user?.role === 'admin' && (
                        <Link to="/admin" className="flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-white/5 transition-colors text-sm font-bold">
                          <Shield size={18} className="text-amber-400" />
                          Admin Console
                        </Link>
                      )}
                      <div className="h-px bg-[var(--border-default)] my-2 mx-2" />
                      <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-red-500/10 transition-colors text-sm font-bold text-red-400 w-full">
                        <LogOut size={18} />
                        End Session
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link to="/login" className="px-6 py-2.5 rounded-xl text-sm font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/[0.04] transition-all">
                  Sign In
                </Link>
                <motion.div whileHover={{ y: -2, scale: 1.03 }} whileTap={{ scale: 0.96 }}>
                  <Link to="/register" className="inline-flex items-center gap-2 px-7 py-3 rounded-2xl bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] text-white text-sm font-black shadow-xl shadow-[var(--accent-primary)]/20 transition-all">
                    <Rocket size={16} />
                    Get Started
                  </Link>
                </motion.div>
              </div>
            )}
          </div>

          {/* Mobile hamburger */}
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden p-3 rounded-2xl bg-[var(--bg-tertiary)] border border-[var(--border-bright)]"
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </motion.button>
        </motion.div>
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ type: 'spring', stiffness: 220, damping: 26 }}
            className="fixed inset-0 bg-[var(--bg-primary)] z-[var(--z-navbar)] lg:hidden flex flex-col overflow-y-auto"
          >
            {/* Grid overlay */}
            <div className="absolute inset-0 opacity-[0.06] bg-[linear-gradient(rgba(255,255,255,.12)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.12)_1px,transparent_1px)] bg-[size:48px_48px] pointer-events-none" />
            
            {/* Header */}
            <div className="flex justify-between items-center p-5 border-b border-[var(--border-default)] relative z-10">
              <Link to="/" onClick={() => setMobileOpen(false)} className="flex items-center gap-3">
                <div className="w-9 h-9 bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] rounded-xl flex items-center justify-center">
                  <Sparkles size={18} className="text-white" />
                </div>
                <span className="text-xl font-black tracking-tighter gradient-text">SynthGen</span>
              </Link>
              <button
                onClick={() => setMobileOpen(false)}
                className="p-2.5 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-bright)]"
              >
                <X size={20} />
              </button>
            </div>

            {/* User profile card (authenticated) */}
            {isAuthenticated && (
              <div className="relative z-10 mx-4 mt-4 p-4 rounded-2xl bg-[var(--bg-tertiary)] border border-[var(--border-default)]">
                <div className="flex items-center gap-3">
                  <Avatar name={user?.username} url={user?.avatar_url} size="sm" />
                  <div className="min-w-0">
                    <p className="font-black text-sm truncate">{user?.username}</p>
                    <p className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-widest">{user?.role}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation links */}
            <div className="relative z-10 p-4 space-y-2">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-tertiary)] px-2 mb-3">Navigation</p>
              {navLinks.filter(l => l.show).map(({ to, label, icon: Icon }, i) => (
                <motion.div
                  key={to}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 + i * 0.05 }}
                >
                  <NavLink
                    to={to}
                    onClick={() => setMobileOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-4 p-4 rounded-2xl font-bold text-base transition-all ${
                        isActive
                          ? 'bg-[var(--accent-primary)]/15 text-[var(--text-primary)] border border-[var(--accent-primary)]/30'
                          : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border border-[var(--border-default)] hover:border-[var(--accent-primary)]/30'
                      }`
                    }
                  >
                    <Icon size={20} />
                    {label}
                  </NavLink>
                </motion.div>
              ))}
            </div>

            {/* Account links (authenticated) */}
            {isAuthenticated && (
              <div className="relative z-10 px-4 pb-4 space-y-2">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-tertiary)] px-2 mb-3">Account</p>
                <Link
                  to="/profile"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-4 p-4 rounded-2xl font-bold text-base bg-[var(--bg-tertiary)] border border-[var(--border-default)] hover:border-[var(--accent-primary)]/30 transition-all text-[var(--text-secondary)]"
                >
                  <User size={20} className="text-[var(--accent-primary)]" />
                  Manage Profile
                </Link>
                {user?.role === 'admin' && (
                  <Link
                    to="/admin"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-4 p-4 rounded-2xl font-bold text-base bg-[var(--bg-tertiary)] border border-[var(--border-default)] hover:border-amber-400/30 transition-all text-[var(--text-secondary)]"
                  >
                    <Shield size={20} className="text-amber-400" />
                    Admin Console
                  </Link>
                )}
              </div>
            )}

            {/* Auth actions */}
            <div className="relative z-10 mt-auto p-4 border-t border-[var(--border-default)] space-y-2">
              {!isAuthenticated ? (
                <>
                  <Link
                    to="/login"
                    onClick={() => setMobileOpen(false)}
                    className="block w-full p-4 rounded-2xl bg-[var(--bg-tertiary)] border border-[var(--border-default)] text-center font-bold"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setMobileOpen(false)}
                    className="block w-full p-4 rounded-2xl bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] text-white text-center font-bold"
                  >
                    Get Started Free
                  </Link>
                </>
              ) : (
                <button
                  onClick={handleLogout}
                  className="w-full p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 font-bold flex items-center justify-center gap-3"
                >
                  <LogOut size={18} />
                  End Session
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
