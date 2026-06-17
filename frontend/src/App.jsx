import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Toaster } from 'react-hot-toast';
import useAuthStore from './store/authStore';
import Navbar from './components/layout/Navbar';
import PageTransition from './components/layout/PageTransition';
import { ProtectedRoute, AdminRoute, GuestRoute } from './router/ProtectedRoute';

const HomePage = lazy(() => import('./pages/HomePage'));
const GeneratePage = lazy(() => import('./pages/GeneratePage'));
const HistoryPage = lazy(() => import('./pages/HistoryPage'));
const JobDetailPage = lazy(() => import('./pages/JobDetailPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/auth/ResetPasswordPage'));
const VerifyEmailPage = lazy(() => import('./pages/auth/VerifyEmailPage'));
const EmailNotVerifiedPage = lazy(() => import('./pages/auth/EmailNotVerifiedPage'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));

function AppLoading() {
  return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function AppRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <PageTransition key={location.pathname}>
        <Suspense fallback={<AppLoading />}>
          <Routes location={location}>
            {/* Public */}
            <Route path="/" element={<HomePage />} />

            {/* Guest only */}
            <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
            <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />
            <Route path="/forgot-password" element={<GuestRoute><ForgotPasswordPage /></GuestRoute>} />
            <Route path="/reset-password" element={<GuestRoute><ResetPasswordPage /></GuestRoute>} />

            {/* Email verification (public) */}
            <Route path="/verify-email" element={<VerifyEmailPage />} />
            <Route path="/verify-pending" element={<EmailNotVerifiedPage />} />

            {/* Protected */}
            <Route path="/generate" element={<GeneratePage />} />
            <Route path="/history" element={<ProtectedRoute><HistoryPage /></ProtectedRoute>} />
            <Route path="/history/:id" element={<ProtectedRoute><JobDetailPage /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />

            {/* Admin */}
            <Route path="/admin/*" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
          </Routes>
        </Suspense>
    </PageTransition>
    </AnimatePresence>
  );
}

function AuthLoader({ children }) {
  const restore = useAuthStore((s) => s.restore);
  const isLoading = useAuthStore((s) => s.isLoading);

  useEffect(() => {
    restore();
  }, [restore]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-[var(--text-secondary)]">Loading SynthGen...</p>
        </div>
      </div>
    );
  }

  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthLoader>
        <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col relative overflow-hidden">
          <Navbar />
          <div className="flex-1 w-full flex flex-col">
            <AppRoutes />
          </div>

          {/* Toast notifications */}
          <Toaster
            position="bottom-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-lg)',
                fontSize: '14px',
              },
              success: {
                iconTheme: {
                  primary: 'var(--accent-success)',
                  secondary: 'var(--bg-secondary)',
                },
              },
              error: {
                iconTheme: {
                  primary: 'var(--accent-error)',
                  secondary: 'var(--bg-secondary)',
                },
              },
            }}
          />
        </div>
      </AuthLoader>
    </BrowserRouter>
  );
}
