import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { User, Shield, Trash2, Lock, Save, BarChart3, Clock, Zap, Activity, AlertTriangle, Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import useAuthStore from '../store/authStore';
import { getProfile, updateProfile, changePassword, deleteAccount } from '../services/api';
import AvatarUpload from '../components/ui/AvatarUpload';
import AnimatedButton from '../components/ui/AnimatedButton';

const TABS = [
  { id: 'stats', label: 'My Stats', icon: BarChart3 },
  { id: 'edit', label: 'Edit Profile', icon: User },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'danger', label: 'Danger Zone', icon: Trash2 },
];

export default function ProfilePage() {
  const { user, updateUser, logout } = useAuthStore();
  const [activeTab, setActiveTab] = useState('stats');
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getProfile().then(({ data }) => {
      if (data) setProfile(data);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div className="w-8 h-8 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full" animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }} />
      </div>
    );
  }

  return (
    <div className="page-content pt-24 pb-12 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6">
          {/* Left — Profile Card */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="p-6 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-default)] lg:sticky lg:top-24 lg:self-start"
          >
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <AvatarUpload
                  currentAvatar={user?.avatar_url}
                  username={user?.username}
                  size={120}
                />
              </div>
              <h2 className="text-xl font-bold">{user?.username}</h2>
              <p className="text-[var(--text-secondary)] text-sm">{user?.email}</p>
              <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-medium ${
                user?.role === 'admin'
                  ? 'bg-[var(--accent-primary)]/15 text-[var(--accent-primary)]'
                  : 'bg-[var(--accent-secondary)]/15 text-[var(--accent-secondary)]'
              }`}>
                {user?.role?.toUpperCase()}
              </span>
              <div className="mt-4 pt-4 border-t border-[var(--border-default)] space-y-2 text-sm text-[var(--text-secondary)]">
                <div className="flex items-center gap-2">
                  <Clock size={14} />
                  <span>Joined {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}</span>
                </div>
                {user?.last_login && (
                  <div className="flex items-center gap-2">
                    <Activity size={14} />
                    <span>Last login {new Date(user.last_login).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Right — Tabs */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-default)]"
          >
            {/* Tab bar */}
            <div className="flex border-b border-[var(--border-default)] overflow-x-auto">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`flex items-center gap-2 px-5 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === t.id
                      ? 'border-[var(--accent-primary)] text-[var(--accent-primary)]'
                      : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <t.icon size={16} />
                  {t.label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="p-6">
              <AnimatePresence mode="wait">
                {activeTab === 'stats' && <StatsTab key="stats" profile={profile} />}
                {activeTab === 'edit' && <EditTab key="edit" user={user} updateUser={updateUser} />}
                {activeTab === 'security' && <SecurityTab key="security" />}
                {activeTab === 'danger' && <DangerTab key="danger" logout={logout} />}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

function StatsTab({ profile }) {
  const stats = [
    { label: 'Total Generations', value: profile?.total_generations || 0, icon: Zap, color: 'var(--accent-primary)' },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="p-4 rounded-2xl bg-[var(--bg-tertiary)] border border-[var(--border-default)]"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `color-mix(in srgb, ${s.color} 15%, transparent)` }}>
                <s.icon size={20} style={{ color: s.color }} />
              </div>
              <div>
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-[var(--text-secondary)]">{s.label}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

function EditTab({ user, updateUser }) {
  const [username, setUsername] = useState(user?.username || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const { data, error } = await updateProfile({ username });
    setSaving(false);
    if (error) { toast.error(error); return; }
    updateUser(data);
    toast.success('Profile updated');
  };

  return (
    <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-6 max-w-md">
      <div className="form-group">
        <label className="form-label">Username</label>
        <div className="relative group">
          <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] group-focus-within:text-[var(--accent-primary)] transition-colors" />
          <input 
            value={username} 
            onChange={(e) => setUsername(e.target.value)} 
            className="form-input pl-12" 
            placeholder="New username"
          />
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Email Address (Read-only)</label>
        <div className="relative">
          <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
          <input 
            value={user?.email || ''} 
            readOnly 
            className="form-input pl-12 opacity-60 cursor-not-allowed bg-[var(--bg-primary)]" 
          />
        </div>
        <p className="text-[10px] text-[var(--text-tertiary)] mt-2 italic px-1">
          Your email address cannot be changed. Contact support for assistance.
        </p>
      </div>
      <div className="pt-2">
        <AnimatedButton 
          onClick={handleSave} 
          loading={saving} 
          icon={Save}
          size="md"
          className="shadow-lg shadow-[var(--accent-primary)]/10"
        >
          Save Changes
        </AnimatedButton>
      </div>
    </motion.div>
  );
}

function SecurityTab() {
  const [form, setForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [saving, setSaving] = useState(false);
  const set = (f) => (e) => setForm((p) => ({ ...p, [f]: e.target.value }));

  const handleSubmit = async () => {
    if (form.new_password !== form.confirm_password) { toast.error('Passwords do not match'); return; }
    setSaving(true);
    const { error } = await changePassword(form);
    setSaving(false);
    if (error) { toast.error(error); return; }
    toast.success('Password changed');
    setForm({ current_password: '', new_password: '', confirm_password: '' });
  };

  return (
    <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-6 max-w-md">
      {[
        ['Current Password', 'current_password'],
        ['New Password', 'new_password'],
        ['Confirm Password', 'confirm_password'],
      ].map(([label, key]) => (
        <div key={key} className="form-group">
          <label className="form-label">{label}</label>
          <div className="relative group">
            <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] group-focus-within:text-[var(--accent-primary)] transition-colors" />
            <input 
              type="password" 
              value={form[key]} 
              onChange={set(key)} 
              className="form-input pl-12" 
              placeholder="••••••••"
            />
          </div>
        </div>
      ))}
      <div className="pt-2">
        <AnimatedButton 
          onClick={handleSubmit} 
          loading={saving} 
          icon={Lock}
          size="md"
          className="shadow-lg shadow-[var(--accent-primary)]/10"
        >
          Update Password
        </AnimatedButton>
      </div>
    </motion.div>
  );
}

function DangerTab({ logout }) {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDelete = async () => {
    if (!password.trim()) { toast.error('Please enter your password'); return; }
    setIsDeleting(true);
    const { error } = await deleteAccount(password);
    setIsDeleting(false);
    if (error) { toast.error(error); return; }
    toast.success('Account deleted. You can register again anytime.');
    logout();
    navigate('/register');
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="p-6 rounded-2xl border-2 border-[var(--accent-error)]/30 bg-[var(--accent-error)]/5">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle size={20} className="text-[var(--accent-error)]" />
          <h3 className="text-lg font-semibold text-[var(--accent-error)]">Delete Account</h3>
        </div>
        <p className="text-sm text-[var(--text-secondary)] mb-4">
          This action is <strong className="text-[var(--accent-error)]">permanent</strong>.
          All your data, generation history, and profile will be permanently deleted.
          You can register again with the same email afterward.
        </p>

        {!showConfirm ? (
          <AnimatedButton variant="danger" onClick={() => setShowConfirm(true)} icon={Trash2}>
            Delete My Account
          </AnimatedButton>
        ) : (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-4">
            <div>
              <label className="block text-sm text-[var(--accent-error)] mb-1.5">
                Enter your password to confirm deletion
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your password"
                className="w-full max-w-sm px-4 py-3 h-12 rounded-2xl bg-[var(--bg-tertiary)] border border-[var(--accent-error)]/30 text-[var(--text-primary)] focus:border-[var(--accent-error)] focus:outline-none"
              />
            </div>
            <div className="flex gap-3">
              <AnimatedButton variant="danger" onClick={handleDelete} loading={isDeleting} icon={Trash2}>
                Permanently Delete
              </AnimatedButton>
              <AnimatedButton variant="secondary" onClick={() => { setShowConfirm(false); setPassword(''); }}>
                Cancel
              </AnimatedButton>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
