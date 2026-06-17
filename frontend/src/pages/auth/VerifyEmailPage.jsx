import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, Loader2, Sparkles } from 'lucide-react';
import { verifyEmail } from '../../services/api';
import AnimatedButton from '../../components/ui/AnimatedButton';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  const email = searchParams.get('email');
  const [status, setStatus] = useState('loading'); // loading | success | error
  const [username, setUsername] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isAlreadyVerified, setIsAlreadyVerified] = useState(false);

  useEffect(() => {
    let cancelled = false;

    queueMicrotask(() => {
      if (cancelled) return;
      if (!token) {
        setStatus('error');
        setErrorMsg('No verification token provided');
        return;
      }

      verifyEmail(token, email).then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          setStatus('error');
          setErrorMsg(typeof error === 'string' ? error : 'Verification failed');
        } else {
          setStatus('success');
          setUsername(data?.username || '');
          if (data?.already_verified) {
            setIsAlreadyVerified(true);
          }
        }
      });
    });

    return () => {
      cancelled = true;
    };
  }, [token, email]);

  return (
    <div className="page-content flex items-center justify-center px-6 pt-20">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md text-center p-8 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-default)]"
      >
        <AnimatePresence mode="wait">
          {status === 'loading' && (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-8">
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                <Loader2 size={48} className="text-[var(--accent-primary)] mx-auto" />
              </motion.div>
              <p className="mt-4 text-[var(--text-secondary)]">Verifying your email...</p>
            </motion.div>
          )}

          {status === 'success' && (
            <motion.div key="success" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-6">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 12 }}
                className="w-20 h-20 rounded-full bg-[var(--accent-success)]/15 flex items-center justify-center mx-auto mb-4"
              >
                <CheckCircle2 size={40} className="text-[var(--accent-success)]" />
              </motion.div>
              <h1 className="text-2xl font-bold mb-2">
                {isAlreadyVerified ? 'Already Verified!' : 'Email Verified'}
              </h1>
              <p className="text-[var(--text-secondary)] mb-6">
                {isAlreadyVerified 
                  ? `Your account${username ? ` (${username})` : ''} is already active. No further action needed.`
                  : `Welcome to SynthGen${username ? `, ${username}` : ''}! Your account is now active.`
                }
              </p>
              <AnimatedButton onClick={() => navigate('/login')} icon={Sparkles} className="mx-auto">
                Login to Start
              </AnimatedButton>
            </motion.div>
          )}

          {status === 'error' && (
            <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-6">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 12 }}
                className="w-20 h-20 rounded-full bg-[var(--accent-error)]/15 flex items-center justify-center mx-auto mb-4"
              >
                <XCircle size={40} className="text-[var(--accent-error)]" />
              </motion.div>
              <h1 className="text-2xl font-bold mb-2">Verification Failed</h1>
              <p className="text-[var(--text-secondary)] mb-6">
                {errorMsg || 'The verification link is expired or invalid.'}
              </p>
              <AnimatedButton
                variant="secondary"
                onClick={() => navigate(`/verify-pending${email ? `?email=${encodeURIComponent(email)}` : ''}`)}
                className="mx-auto"
              >
                Resend Verification
              </AnimatedButton>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
