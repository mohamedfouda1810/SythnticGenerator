import { useState } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, RefreshCw, ArrowLeft, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { resendVerification } from '../../services/api';
import AnimatedButton from '../../components/ui/AnimatedButton';

export default function EmailNotVerifiedPage() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();

  // Email from either location.state (register flow) or query param (login redirect)
  const initialEmail = location.state?.email || searchParams.get('email') || '';
  const [email, setEmail] = useState(initialEmail);

  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  const handleResend = async () => {
    const normalizedEmail = email.trim();
    if (!normalizedEmail) { toast.error('Enter your email address first'); return; }
    setResending(true);
    const { error } = await resendVerification(normalizedEmail);
    setResending(false);
    if (error) { toast.error(typeof error === 'string' ? error : 'Failed to resend'); return; }
    setResent(true);
    toast.success('Verification email sent! Please check your inbox and spam folder.');
  };

  return (
    <div className="page-content flex items-center justify-center px-6 pt-24">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md text-center p-8 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-default)]"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 12 }}
          className="w-20 h-20 rounded-full bg-[var(--accent-warning)]/15 flex items-center justify-center mx-auto mb-5"
        >
          <Mail size={40} className="text-[var(--accent-warning)]" />
        </motion.div>

        <h1 className="text-2xl font-bold mb-2">Verify Your Email</h1>
        <p className="text-[var(--text-secondary)] mb-2">Your account is not yet verified.</p>
        <p className="text-sm text-[var(--text-secondary)] mb-6">
          {initialEmail ? (
            <>
              We sent a verification link to{' '}
              <strong className="text-[var(--text-primary)]">{initialEmail}</strong>.{' '}
              Please check your <strong>inbox and spam folder</strong>.
            </>
          ) : (
            'Enter your email to receive a fresh verification link.'
          )}
        </p>

        {/* Email input — only shown when arriving without a known email */}
        {!initialEmail && (
          <div className="relative mb-6 text-left">
            <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 mb-2 ml-1">
              Account Email
            </label>
            <Mail size={18} className="absolute left-4 bottom-3.5 text-gray-500" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              className="form-input-premium input-with-icon h-12"
            />
          </div>
        )}

        <div className="space-y-3">
          {resent ? (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex flex-col items-center gap-3 py-4"
            >
              <div className="flex items-center gap-2 text-[var(--accent-success)]">
                <CheckCircle2 size={20} />
                <span className="text-sm font-semibold">Verification email sent!</span>
              </div>
              <p className="text-xs text-[var(--text-secondary)]">
                Check your inbox and spam folder for the verification link.
              </p>
              <button
                onClick={() => { setResent(false); handleResend(); }}
                disabled={resending}
                className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] underline underline-offset-2 transition-colors mt-1"
              >
                Didn&apos;t receive it? Send again
              </button>
            </motion.div>
          ) : (
            <AnimatedButton onClick={handleResend} loading={resending} icon={RefreshCw} className="w-full">
              Resend Verification Email
            </AnimatedButton>
          )}

          <AnimatedButton variant="secondary" onClick={() => navigate('/login')} icon={ArrowLeft} className="w-full">
            Back to Login
          </AnimatedButton>
        </div>
      </motion.div>
    </div>
  );
}
