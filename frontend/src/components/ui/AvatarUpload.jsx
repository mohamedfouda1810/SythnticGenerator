import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Loader2, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { uploadAvatar } from '../../services/api';
import useAuthStore from '../../store/authStore';

export default function AvatarUpload({ currentAvatar, username, size = 120 }) {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const fileInput = useRef(null);
  const updateAvatar = useAuthStore((s) => s.updateAvatar);

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Client-side validation
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Only JPEG, PNG, and WebP images are allowed');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be under 2MB');
      return;
    }

    // Show preview immediately
    setPreviewUrl(URL.createObjectURL(file));
    setIsUploading(true);

    const { data, error } = await uploadAvatar(file);
    setIsUploading(false);

    if (error) {
      toast.error(error);
      setPreviewUrl(null);
      return;
    }

    // Update auth store so avatar refreshes everywhere
    updateAvatar(data.avatar_url);
    setShowSuccess(true);
    toast.success('Avatar updated!');
    setTimeout(() => setShowSuccess(false), 2000);
  };

  const displayUrl = previewUrl || currentAvatar;
  const initial = username?.charAt(0)?.toUpperCase() || '?';

  return (
    <div className="relative group" style={{ width: size, height: size }}>
      {/* Avatar circle */}
      <div
        className="w-full h-full rounded-full overflow-hidden border-2 border-[var(--border-default)] transition-all duration-300 group-hover:border-[var(--accent-primary)]"
        style={{ width: size, height: size }}
      >
        {displayUrl ? (
          <img
            src={displayUrl}
            alt={username}
            className="w-full h-full object-cover"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-2xl font-bold"
            style={{
              background: `linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))`,
              color: '#fff',
              fontSize: size * 0.35,
            }}
          >
            {initial}
          </div>
        )}
      </div>

      {/* Hover overlay */}
      <motion.button
        onClick={() => fileInput.current?.click()}
        className="absolute inset-0 rounded-full flex flex-col items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
        whileTap={{ scale: 0.95 }}
        disabled={isUploading}
      >
        <AnimatePresence mode="wait">
          {isUploading ? (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Loader2 size={24} className="text-white animate-spin" />
            </motion.div>
          ) : showSuccess ? (
            <motion.div key="success" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
              <CheckCircle2 size={24} className="text-[var(--accent-success)]" />
            </motion.div>
          ) : (
            <motion.div key="camera" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center">
              <Camera size={20} className="text-white mx-auto mb-1" />
              <span className="text-xs text-white/80">Change</span>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      <input
        ref={fileInput}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}
