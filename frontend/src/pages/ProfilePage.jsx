import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Shield, Trash2, Lock, Save, BarChart3, Clock, Zap, Activity } from 'lucide-react';
import toast from 'react-hot-toast';
import useAuthStore from '../store/authStore';
import { getProfile, updateProfile, changePassword, deleteAccount } from '../services/api';
import Avatar from '../components/ui/Avatar';
import AnimatedButton from '../components/ui/AnimatedButton';
import ConfirmModal from '../components/ui/ConfirmModal';

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
    <div className="min-h-screen pt-20 pb-12 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left — Profile Card */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-1 p-6 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-default)]"
          >
            <div className="text-center">
              <Avatar name={user?.username} url={user?.avatar_url} size="xl" className="mx-auto mb-4" />
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
            className="lg:col-span-2 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-default)]"
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
            transition={{ delay: i * 0.1 }}
            className="p-4 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-default)]"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `color-mix(in srgb, ${s.color} 15%, transparent)` }}>
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
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const { data, error } = await updateProfile({ username, avatar_url: avatarUrl || null });
    setSaving(false);
    if (error) { toast.error(error); return; }
    updateUser(data);
    toast.success('Profile updated');
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-5 max-w-md">
      <div>
        <label className="block text-sm text-[var(--text-secondary)] mb-1.5">Username</label>
        <input value={username} onChange={(e) => setUsername(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-default)] text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:outline-none" />
      </div>
      <div>
        <label className="block text-sm text-[var(--text-secondary)] mb-1.5">Email</label>
        <input value={user?.email || ''} readOnly className="w-full px-4 py-3 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-default)] text-[var(--text-tertiary)] opacity-60 cursor-not-allowed" />
      </div>
      <div>
        <label className="block text-sm text-[var(--text-secondary)] mb-1.5">Avatar URL</label>
        <input value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://..." className="w-full px-4 py-3 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-default)] text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:outline-none" />
      </div>
      <AnimatedButton onClick={handleSave} loading={saving} icon={Save}>Save Changes</AnimatedButton>
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
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-5 max-w-md">
      <div>
        <label className="block text-sm text-[var(--text-secondary)] mb-1.5">Current Password</label>
        <input type="password" value={form.current_password} onChange={set('current_password')} className="w-full px-4 py-3 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-default)] text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:outline-none" />
      </div>
      <div>
        <label className="block text-sm text-[var(--text-secondary)] mb-1.5">New Password</label>
        <input type="password" value={form.new_password} onChange={set('new_password')} className="w-full px-4 py-3 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-default)] text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:outline-none" />
      </div>
      <div>
        <label className="block text-sm text-[var(--text-secondary)] mb-1.5">Confirm Password</label>
        <input type="password" value={form.confirm_password} onChange={set('confirm_password')} className="w-full px-4 py-3 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-default)] text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:outline-none" />
      </div>
      <AnimatedButton onClick={handleSubmit} loading={saving} icon={Lock}>Update Password</AnimatedButton>
    </motion.div>
  );
}

function DangerTab({ logout }) {
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDelete = async () => {
    const { error } = await deleteAccount();
    if (error) { toast.error(error); return; }
    toast.success('Account deactivated');
    logout();
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="p-4 rounded-xl border-2 border-[var(--accent-error)]/30 bg-[var(--accent-error)]/5">
        <h3 className="text-lg font-semibold text-[var(--accent-error)] mb-2">Delete Account</h3>
        <p className="text-sm text-[var(--text-secondary)] mb-4">
          Once you delete your account, there is no going back. All your data and generation history will be lost.
        </p>
        <AnimatedButton variant="danger" onClick={() => setShowConfirm(true)} icon={Trash2}>
          Delete My Account
        </AnimatedButton>
      </div>

      <ConfirmModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleDelete}
        title="Delete Account"
        description="This will permanently deactivate your account. You will no longer be able to log in."
        confirmText="Delete"
        destructive
        requireType
      />
    </motion.div>
  );
}
