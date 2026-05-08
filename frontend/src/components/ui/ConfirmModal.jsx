import { useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import Modal from './Modal';
import AnimatedButton from './AnimatedButton';

export default function ConfirmModal({ isOpen, onClose, onConfirm, title, description, confirmText = 'Confirm', destructive = false, requireType = false }) {
  const [typed, setTyped] = useState('');
  const [loading, setLoading] = useState(false);

  const canConfirm = requireType ? typed === 'DELETE' : true;

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
    } finally {
      setLoading(false);
      setTyped('');
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title || 'Confirm Action'}>
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          {destructive && (
            <div className="w-10 h-10 rounded-lg bg-[var(--accent-error)]/15 flex items-center justify-center flex-shrink-0">
              <AlertTriangle size={20} className="text-[var(--accent-error)]" />
            </div>
          )}
          <p className="text-[var(--text-secondary)] text-sm leading-relaxed">
            {description || 'Are you sure you want to proceed? This action cannot be undone.'}
          </p>
        </div>

        {requireType && (
          <div>
            <p className="text-xs text-[var(--text-tertiary)] mb-2">
              Type <span className="font-mono font-bold text-[var(--accent-error)]">DELETE</span> to confirm
            </p>
            <input
              type="text"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder="DELETE"
              className="w-full px-3 py-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-default)] text-sm font-mono text-[var(--text-primary)] focus:border-[var(--accent-error)] focus:outline-none"
            />
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <AnimatedButton variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </AnimatedButton>
          <AnimatedButton
            variant={destructive ? 'danger' : 'primary'}
            size="sm"
            onClick={handleConfirm}
            disabled={!canConfirm}
            loading={loading}
          >
            {confirmText}
          </AnimatedButton>
        </div>
      </div>
    </Modal>
  );
}
