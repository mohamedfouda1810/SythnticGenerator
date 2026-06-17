import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Lock, Eye, EyeOff, UserPlus, AlertCircle, Check, X as XIcon, Sparkles, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { registerUser } from '../../services/api';
import AnimatedButton from '../../components/ui/AnimatedButton';

function getStrength(pw) {
  if (!pw) return { label: 'Empty', pct: 0, color: 'var(--border-default)' };
  if (pw.length < 8) return { label: 'Too Short', pct: 25, color: '#EF4444' };
  let score = 1;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const map = [
    { label: 'Standard', pct: 50, color: '#F59E0B' },
    { label: 'Advanced', pct: 75, color: '#3B82F6' },
    { label: 'Elite', pct: 100, color: '#10B981' },
  ];
  return map[score - 1] || map[0];
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', email: '', password: '', confirm_password: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldError, setFieldError] = useState({ email: '', username: '' });
  const [emailConflict, setEmailConflict] = useState(false);

  const strength = getStrength(form.password);
  const passwordsMatch = form.confirm_password.length > 0 && form.password === form.confirm_password;

  const set = (field) => (e) => {
    setForm((p) => ({ ...p, [field]: e.target.value }));
    if (field === 'email' || field === 'username') {
      setFieldError((p) => ({ ...p, [field]: '' }));
      if (field === 'email') setEmailConflict(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirm_password) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    const { error: err } = await registerUser(form);
    setLoading(false);

    if (err) {
      const errLower = typeof err === 'string' ? err.toLowerCase() : '';
      if (errLower.includes('email')) {
        setEmailConflict(true);
        setFieldError({ email: err, username: '' });
      } else if (errLower.includes('username')) {
        setFieldError({ email: '', username: err });
      } else {
        setError(err);
      }
      return;
    }

    toast.success('Account created! A verification email has been sent.');
    navigate('/verify-pending', {
      state: { email: form.email },
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-20 relative overflow-hidden bg-[var(--bg-primary)]">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,var(--accent-primary)_0%,transparent_50%)] opacity-[0.05]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_70%,var(--accent-secondary)_0%,transparent_50%)] opacity-[0.05]" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[540px] z-10"
      >
        <div className="glass-morphism-strong rounded-3xl p-8 md:p-12 shadow-2xl border border-gray-800 relative">
          
          <Link to="/login" className="absolute top-10 left-10 text-gray-500 hover:text-white transition-colors p-2 rounded-xl hover:bg-white/5">
            <ArrowLeft size={20} />
          </Link>

          <div className="text-center mb-6 pt-4">
            <motion.div
              whileHover={{ scale: 1.05, rotate: -5 }}
              className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-2xl group"
            >
              <Sparkles size={32} className="text-white group-hover:animate-pulse" />
            </motion.div>
            <h1 className="text-3xl font-black mb-3 tracking-tight">Create Profile</h1>
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em]">Join the SynthGen Ecosystem</p>
          </div>

          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-3 p-5 mb-8 rounded-2xl bg-red-500/5 border border-red-500/10 text-[10px] font-black uppercase text-red-400"
              >
                <AlertCircle size={16} />
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 ml-1">Username</label>
                <div className="relative group">
                  <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-500 transition-colors z-10" />
                  <input
                    type="text"
                    value={form.username}
                    onChange={set('username')}
                    required minLength={3} maxLength={30}
                    placeholder="architect"
                    className={`form-input-premium input-with-icon h-12 ${fieldError.username ? 'border-red-500/50 focus:ring-red-500/20' : ''}`}
                  />
                </div>
                {fieldError.username && <p className="text-[9px] text-red-400 font-bold ml-1 uppercase tracking-wider">{fieldError.username}</p>}
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 ml-1">Email</label>
                <div className="relative group">
                  <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-500 transition-colors z-10" />
                  <input
                    type="email"
                    value={form.email}
                    onChange={set('email')}
                    required
                    placeholder="you@lab.com"
                    className={`form-input-premium input-with-icon h-12 ${fieldError.email ? 'border-red-500/50 focus:ring-red-500/20' : ''}`}
                  />
                </div>
                {fieldError.email && !emailConflict && (
                  <p className="text-[9px] text-red-400 font-bold ml-1 uppercase tracking-wider">{fieldError.email}</p>
                )}
                {emailConflict && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-2 p-3 rounded-xl bg-amber-500/8 border border-amber-500/20 text-left"
                  >
                    <p className="text-[10px] text-amber-400 font-bold uppercase tracking-wider mb-1">Email already registered</p>
                    <p className="text-[10px] text-gray-400">
                      Already have an account?{' '}
                      <Link to="/login" className="text-blue-400 hover:text-white underline">Log in</Link>
                      {' '}or{' '}
                      <Link to="/verify-pending" state={{ email: form.email }} className="text-blue-400 hover:text-white underline">resend verification</Link>.
                    </p>
                  </motion.div>
                )}

              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 ml-1">Secret Key</label>
              <div className="relative group">
                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-500 transition-colors z-10" />
                <input
                  type={showPw ? 'text' : 'password'}
                  value={form.password}
                  onChange={set('password')}
                  required minLength={8}
                  placeholder="••••••••"
                  className="form-input-premium input-with-icon pr-12 h-12"
                />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors z-10">
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              
              {/* Enhanced Strength Meter */}
              <div className="mt-4 px-1">
                <div className="h-1.5 rounded-full bg-black/40 overflow-hidden flex">
                  <motion.div
                    className="h-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${strength.pct}%` }}
                    style={{ background: strength.color }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
                <div className="flex justify-between items-center mt-2">
                  <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: strength.color }}>{strength.label}</p>
                  <p className="text-[9px] text-gray-600 font-black tracking-tighter">MIN 8 CHARS</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 ml-1">Confirm Identity</label>
              <div className="relative group">
                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-500 transition-colors z-10" />
                <input
                  type="password"
                  value={form.confirm_password}
                  onChange={set('confirm_password')}
                  required
                  placeholder="••••••••"
                  className={`form-input-premium input-with-icon h-12 ${form.confirm_password && !passwordsMatch ? 'border-red-500/50' : ''}`}
                />
                {form.confirm_password && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    {passwordsMatch ? (
                      <Check size={18} className="text-emerald-500" />
                    ) : (
                      <XIcon size={18} className="text-red-400" />
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="pt-8">
              <AnimatedButton type="submit" loading={loading} icon={UserPlus} size="lg" className="w-full h-14 text-base">
                Register Account
              </AnimatedButton>
            </div>
          </form>

          <p className="text-center text-[11px] font-bold text-gray-500 mt-12">
            Already registered?{' '}
            <Link to="/login" className="text-blue-400 hover:text-white transition-colors ml-1 font-black uppercase tracking-widest">Launch Session</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
