import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Toaster } from 'react-hot-toast';
import useAuthStore from './store/authStore';
import Navbar from './components/layout/Navbar';
import PageTransition from './components/layout/PageTransition';
import { ProtectedRoute, AdminRoute, GuestRoute } from './router/ProtectedRoute';

// Pages
import HomePage from './pages/HomePage';
import GeneratePage from './pages/GeneratePage';
import HistoryPage from './pages/HistoryPage';
import JobDetailPage from './pages/JobDetailPage';
import ProfilePage from './pages/ProfilePage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import VerifyEmailPage from './pages/auth/VerifyEmailPage';
import EmailNotVerifiedPage from './pages/auth/EmailNotVerifiedPage';
import AdminDashboard from './pages/admin/AdminDashboard';

function AppRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <PageTransition key={location.pathname}>
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
        <div className="min-h-screen bg-[var(--bg-primary)]">
          <Navbar />
          <AppRoutes />

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
