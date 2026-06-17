import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Mail, Send, CheckCircle } from 'lucide-react';
import { forgotPassword } from '../../services/api';
import AnimatedButton from '../../components/ui/AnimatedButton';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await forgotPassword(email);
    setLoading(false);
    setSent(true);
  };

  return (
    <div className="page-content flex items-center justify-center p-8 pt-24">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {sent ? (
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.2 }}
              className="w-16 h-16 rounded-full bg-[var(--accent-success)]/15 flex items-center justify-center mx-auto mb-4"
            >
              <CheckCircle size={32} className="text-[var(--accent-success)]" />
            </motion.div>
            <h2 className="text-2xl font-bold mb-2">Check Your Inbox</h2>
            <p className="text-[var(--text-secondary)] mb-6">
              If an account exists with {email}, we've sent a password reset link.
            </p>
            <Link to="/login" className="text-[var(--accent-primary)] hover:underline">Back to Login</Link>
          </motion.div>
        ) : (
          <>
            <h1 className="text-3xl font-bold mb-2">Forgot Password</h1>
            <p className="text-[var(--text-secondary)] mb-8">Enter your email and we'll send you a reset link</p>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm text-[var(--text-secondary)] mb-1.5">Email</label>
                <div className="relative">
                  <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="you@example.com"
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-default)] text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:outline-none transition-colors"
                  />
                </div>
              </div>
              <AnimatedButton type="submit" loading={loading} icon={Send} size="lg" className="w-full">
                Send Reset Link
              </AnimatedButton>
            </form>

            <p className="text-center text-sm text-[var(--text-secondary)] mt-6">
              <Link to="/login" className="text-[var(--accent-primary)] hover:underline">Back to Login</Link>
            </p>
          </>
        )}
      </motion.div>
    </div>
  );
}
