import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, LogIn, AlertCircle, Sparkles, CheckCircle2, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import useAuthStore from '../../store/authStore';
import { loginUser } from '../../services/api';
import AnimatedButton from '../../components/ui/AnimatedButton';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const login = useAuthStore((s) => s.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Show success banner if user was redirected after manual email verification
  const justVerified = location.state?.verified === true;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { data, error: err } = await loginUser({ email, password });
    setLoading(false);

    if (err) {
      if (typeof err === 'object' && err.error === 'email_not_verified') {
        navigate(`/verify-pending?email=${encodeURIComponent(err.email || email)}`);
        return;
      }
      setError(typeof err === 'string' ? err : 'Authentication failed');
      return;
    }

    login(data.user, data.access_token, data.refresh_token);
    toast.success(`Welcome back, ${data.user.username}!`);
    navigate('/generate');
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-20 relative overflow-hidden bg-[var(--bg-primary)]">
      {/* Dynamic Background */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_30%_30%,var(--accent-primary)_0%,transparent_40%)] opacity-[0.05]" />
      <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(circle_at_70%_70%,var(--accent-secondary)_0%,transparent_40%)] opacity-[0.05]" />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-[460px] z-10"
      >
        <div className="glass-morphism-strong rounded-3xl p-8 md:p-12 shadow-[0_0_100px_rgba(0,0,0,0.6)] border border-gray-800 relative overflow-hidden">
          {/* Top Accent */}
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-600 via-indigo-500 to-blue-600" />

          {/* Header */}
          <div className="text-center mb-8">
            <motion.div
              whileHover={{ scale: 1.05, rotate: 5 }}
              className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-2xl relative group"
            >
              <Sparkles size={28} className="text-white relative z-10 group-hover:animate-pulse" />
              <div className="absolute inset-0 bg-white opacity-20 blur-2xl rounded-full scale-150 group-hover:opacity-40 transition-opacity" />
            </motion.div>
            <h1 className="text-3xl font-black mb-2 tracking-tight">Access Engine</h1>
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em]">Professional Synthetic Intelligence</p>
          </div>

          <AnimatePresence mode="wait">
            {justVerified && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center gap-3 p-5 mb-8 rounded-2xl bg-emerald-500/8 border border-emerald-500/20 text-xs font-bold text-emerald-400"
              >
                <CheckCircle2 size={18} className="shrink-0" />
                Email verified successfully! You can now log in.
              </motion.div>
            )}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center gap-3 p-5 mb-8 rounded-2xl bg-red-500/5 border border-red-500/10 text-xs font-bold text-red-400"
              >
                <AlertCircle size={18} className="shrink-0" />
                {error}
              </motion.div>
            )}
          </AnimatePresence>


          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 ml-1">Identity Endpoint</label>
              <div className="relative group">
                <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-500 transition-colors z-10" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="architect@synthgen.ai"
                  className="form-input-premium input-with-icon h-14"
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center ml-1">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Security Key</label>
                <Link to="/forgot-password" strokeWidth={2.5} className="text-[10px] font-black uppercase tracking-widest text-blue-400 hover:text-blue-300 transition-colors">
                  Forgot Access?
                </Link>
              </div>
              <div className="relative group">
                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-500 transition-colors z-10" />
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="form-input-premium input-with-icon h-14"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors z-10"
                >
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="pt-4">
              <AnimatedButton
                type="submit"
                loading={loading}
                icon={LogIn}
                size="lg"
                className="w-full h-14 shadow-2xl text-base"
              >
                Launch Session
              </AnimatedButton>
            </div>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-800/50 text-center">
            <p className="text-[11px] font-bold text-gray-500">
              New to the ecosystem?{' '}
              <Link to="/register" className="text-blue-400 hover:text-white transition-colors inline-flex items-center gap-2 group ml-1">
                Create Account <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
