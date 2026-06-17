import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Search, ShieldCheck, ShieldOff, Trash2, UserCog } from 'lucide-react';
import toast from 'react-hot-toast';
import { getAdminUsers, blockUser, changeUserRole, deleteUser } from '../../../services/api';
import Avatar from '../../../components/ui/Avatar';
import ConfirmModal from '../../../components/ui/ConfirmModal';

const FILTERS = ['all', 'active', 'blocked', 'admin'];

export default function UsersPanel() {
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const fetchUsers = useCallback(async (overridePage = page) => {
    setLoading(true);
    const params = { page: overridePage, limit: 20, search: search || undefined };
    if (filter === 'active') { params.is_active = true; params.is_blocked = false; }
    if (filter === 'blocked') params.is_blocked = true;
    if (filter === 'admin') params.role = 'admin';

    const { data } = await getAdminUsers(params);
    if (data) {
      setUsers(data.users);
      setTotal(data.total);
      setPages(data.pages);
    }
    setLoading(false);
  }, [filter, page, search]);

  useEffect(() => {
    queueMicrotask(() => fetchUsers(page));
  }, [fetchUsers, page]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchUsers(1);
  };

  const handleBlock = async (id) => {
    const { data, error } = await blockUser(id);
    if (error) { toast.error(error); return; }
    toast.success(data.message);
    fetchUsers();
  };

  const handleRoleChange = async (id, currentRole) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    const { error } = await changeUserRole(id, newRole);
    if (error) { toast.error(error); return; }
    toast.success(`Role changed to ${newRole}`);
    fetchUsers();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await deleteUser(deleteTarget);
    if (error) { toast.error(error); return; }
    toast.success('User deleted');
    setDeleteTarget(null);
    fetchUsers();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Users Management</h1>

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <form onSubmit={handleSearch} className="flex-1 relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by username or email..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-default)] text-sm text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:outline-none"
          />
        </form>
        <div className="flex gap-2">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => { setFilter(f); setPage(1); }}
              className={`px-3 py-2 rounded-lg text-xs font-medium capitalize transition-colors ${
                filter === f ? 'bg-[var(--accent-primary)] text-white' : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-default)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border-default)]">
                <th className="text-left px-4 py-3 font-medium text-[var(--text-secondary)]">User</th>
                <th className="text-left px-4 py-3 font-medium text-[var(--text-secondary)]">Role</th>
                <th className="text-left px-4 py-3 font-medium text-[var(--text-secondary)]">Status</th>
                <th className="text-left px-4 py-3 font-medium text-[var(--text-secondary)]">Gens</th>
                <th className="text-left px-4 py-3 font-medium text-[var(--text-secondary)]">Joined</th>
                <th className="text-right px-4 py-3 font-medium text-[var(--text-secondary)]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-[var(--border-default)]">
                    <td colSpan={6} className="px-4 py-4">
                      <div className="h-4 bg-[var(--bg-tertiary)] rounded animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-[var(--text-secondary)]">No users found</td>
                </tr>
              ) : (
                users.map((u) => (
                  <motion.tr
                    key={u.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="border-b border-[var(--border-default)] hover:bg-[var(--bg-tertiary)]/50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={u.username} url={u.avatar_url} size="sm" />
                        <div>
                          <p className="font-medium">{u.username}</p>
                          <p className="text-xs text-[var(--text-tertiary)]">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        u.role === 'admin' ? 'bg-amber-500/15 text-amber-400' : 'bg-blue-500/15 text-blue-400'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        u.is_blocked ? 'bg-red-500/15 text-red-400' : u.is_active ? 'bg-green-500/15 text-green-400' : 'bg-gray-500/15 text-gray-400'
                      }`}>
                        {u.is_blocked ? 'Blocked' : u.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium">{u.generation_count || 0}</td>
                    <td className="px-4 py-3 text-[var(--text-secondary)] text-xs">{u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleBlock(u.id)}
                          title={u.is_blocked ? 'Unblock' : 'Block'}
                          className={`p-1.5 rounded-lg transition-colors ${u.is_blocked ? 'text-green-400 hover:bg-green-500/10' : 'text-amber-400 hover:bg-amber-500/10'}`}
                        >
                          {u.is_blocked ? <ShieldCheck size={16} /> : <ShieldOff size={16} />}
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleRoleChange(u.id, u.role)}
                          title="Toggle role"
                          className="p-1.5 rounded-lg text-blue-400 hover:bg-blue-500/10 transition-colors"
                        >
                          <UserCog size={16} />
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => setDeleteTarget(u.id)}
                          title="Delete"
                          className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
                        >
                          <Trash2 size={16} />
                        </motion.button>
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--border-default)]">
            <p className="text-xs text-[var(--text-secondary)]">{total} total users</p>
            <div className="flex gap-1">
              {Array.from({ length: pages }, (_, i) => (
                <button
                  key={i}
                  onClick={() => setPage(i + 1)}
                  className={`w-8 h-8 rounded-lg text-xs font-medium ${page === i + 1 ? 'bg-[var(--accent-primary)] text-white' : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete User"
        description="This will permanently delete this user and all their generation history. This cannot be undone."
        confirmText="Delete User"
        destructive
        requireType
      />
    </div>
  );
}
