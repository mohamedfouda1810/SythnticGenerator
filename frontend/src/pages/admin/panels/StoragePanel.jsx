import { useState } from 'react';
import { motion } from 'framer-motion';
import { HardDrive, Trash2, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { runCleanup } from '../../../services/api';
import AnimatedButton from '../../../components/ui/AnimatedButton';

export default function StoragePanel() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleCleanup = async () => {
    setLoading(true);
    const { data, error } = await runCleanup();
    setLoading(false);
    if (error) { toast.error(error); return; }
    setResult(data);
    toast.success('Cleanup complete!');
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Storage Management</h1>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-default)]"
      >
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
            <HardDrive size={24} className="text-blue-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold mb-1">Temporary File Cleanup</h3>
            <p className="text-sm text-[var(--text-secondary)] mb-4">
              Remove expired in-memory synthetic data results. Results expire after 1 hour, but may remain until cleanup.
            </p>

            <AnimatedButton onClick={handleCleanup} loading={loading} icon={Trash2} variant="secondary">
              Run Cleanup
            </AnimatedButton>
          </div>
        </div>

        {result && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-4 pt-4 border-t border-[var(--border-default)]"
          >
            <div className="flex items-center gap-2 text-[var(--accent-success)] mb-2">
              <CheckCircle size={16} />
              <span className="text-sm font-medium">Cleanup Completed</span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="p-3 rounded-lg bg-[var(--bg-tertiary)]">
                <p className="text-[var(--text-secondary)]">Deleted</p>
                <p className="text-xl font-bold">{result.deleted_files_count}</p>
              </div>
              <div className="p-3 rounded-lg bg-[var(--bg-tertiary)]">
                <p className="text-[var(--text-secondary)]">Remaining</p>
                <p className="text-xl font-bold">{result.remaining}</p>
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
