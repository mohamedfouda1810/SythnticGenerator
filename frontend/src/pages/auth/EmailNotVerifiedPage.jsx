import { useState } from 'react';
import { useSearchParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, RefreshCw, ArrowLeft, CheckCircle2, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import { resendVerification } from '../../services/api';
import AnimatedButton from '../../components/ui/AnimatedButton';

export default function EmailNotVerifiedPage() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();

  // Email from either location.state (register flow) or query param (login redirect)
  const email = location.state?.email || searchParams.get('email') || '';

  // Dev mode data from registration response or resend response
  const [devVerifyUrl, setDevVerifyUrl] = useState(location.state?.devVerifyUrl || null);
  const [devToken, setDevToken] = useState(location.state?.devToken || null);

  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  const handleResend = async () => {
    if (!email) { toast.error('No email address'); return; }
    setResending(true);
    const { data, error } = await resendVerification(email);
    setResending(false);
    if (error) { toast.error(typeof error === 'string' ? error : 'Failed to resend'); return; }

    // Update dev info if resend returns it
    if (data?.dev_verify_url) {
      setDevVerifyUrl(data.dev_verify_url);
      setDevToken(data.dev_token || null);
    }

    setResent(true);
    toast.success('Verification email resent!');
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 pt-24">
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
        <p className="text-[var(--text-secondary)] mb-2">
          Your account is not yet verified.
        </p>
        {email && (
          <p className="text-sm text-[var(--text-secondary)] mb-6">
            We sent a verification link to <strong className="text-[var(--text-primary)]">{email}</strong>
          </p>
        )}

        {/* ─── Dev Mode Verify Link ──────────────────────── */}
        {devVerifyUrl && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 rounded-xl border-2 border-[var(--accent-warning)]/40 bg-[var(--accent-warning)]/5"
          >
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="text-sm font-bold text-[var(--accent-warning)]">🔧 Development Mode</span>
            </div>
            <p className="text-xs text-[var(--text-secondary)] mb-3">
              No email server configured. Use the link below to verify:
            </p>
            <a
              href={devVerifyUrl}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[var(--accent-success)]/15 border border-[var(--accent-success)]/30 text-[var(--accent-success)] font-medium text-sm hover:bg-[var(--accent-success)]/25 transition-colors"
            >
              <CheckCircle2 size={16} />
              Verify Email Now
              <ExternalLink size={14} />
            </a>
            {devToken && (
              <p className="text-[10px] text-[var(--text-tertiary)] mt-3 font-mono break-all">
                Token: {devToken}
              </p>
            )}
          </motion.div>
        )}

        <div className="space-y-3">
          {resent && !devVerifyUrl ? (
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="flex items-center justify-center gap-2 text-[var(--accent-success)]">
              <CheckCircle2 size={18} />
              <span className="text-sm font-medium">Verification email resent!</span>
            </motion.div>
          ) : (
            <AnimatedButton onClick={handleResend} loading={resending} icon={RefreshCw} className="w-full">
              {resent ? 'Resend Again' : 'Resend Verification Email'}
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
