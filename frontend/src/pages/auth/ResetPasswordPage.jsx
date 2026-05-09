import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, KeyRound } from 'lucide-react';
import toast from 'react-hot-toast';
import { resetPassword } from '../../services/api';
import AnimatedButton from '../../components/ui/AnimatedButton';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [token, setToken] = useState(params.get('token') || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    const { data, error: err } = await resetPassword({
      token,
      new_password: newPassword,
      confirm_password: confirmPassword,
    });
    setLoading(false);

    if (err) {
      setError(err);
      return;
    }

    toast.success('Password reset successfully!');
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-8 pt-24">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <h1 className="text-3xl font-bold mb-2">Reset Password</h1>
        <p className="text-[var(--text-secondary)] mb-8">Enter your new password</p>

        {error && (
          <div className="p-3 mb-4 rounded-lg bg-[var(--accent-error)]/10 border border-[var(--accent-error)]/30 text-sm text-[var(--accent-error)]">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {!params.get('token') && (
            <div>
              <label className="block text-sm text-[var(--text-secondary)] mb-1.5">Reset Token</label>
              <div className="relative">
                <KeyRound size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
                <input
                  type="text"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  required
                  placeholder="Paste your reset token"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-default)] text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:outline-none transition-colors"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm text-[var(--text-secondary)] mb-1.5">New Password</label>
            <div className="relative">
              <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required minLength={8}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-default)] text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:outline-none transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-[var(--text-secondary)] mb-1.5">Confirm New Password</label>
            <div className="relative">
              <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-default)] text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:outline-none transition-colors"
              />
            </div>
          </div>

          <AnimatedButton onClick={handleSubmit} loading={loading} size="lg" className="w-full">
            Reset Password
          </AnimatedButton>
        </form>
      </motion.div>
    </div>
  );
}
