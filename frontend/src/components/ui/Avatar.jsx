import { motion } from 'framer-motion';

const sizes = { sm: 32, md: 40, lg: 64, xl: 96 };
const textSizes = { sm: 'text-xs', md: 'text-sm', lg: 'text-xl', xl: 'text-3xl' };

const gradients = [
  'linear-gradient(135deg, #6C63FF, #00D4FF)',
  'linear-gradient(135deg, #FF6B6B, #FFB800)',
  'linear-gradient(135deg, #00FF88, #00D4FF)',
  'linear-gradient(135deg, #A855F7, #EC4899)',
  'linear-gradient(135deg, #3B82F6, #6C63FF)',
];

function getGradient(name) {
  const idx = (name || '').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return gradients[idx % gradients.length];
}

function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

export default function Avatar({ name, url, size = 'md', className = '' }) {
  const s = sizes[size] || sizes.md;

  if (url) {
    return (
      <motion.img
        whileHover={{ scale: 1.05 }}
        src={url}
        alt={name}
        className={`rounded-full object-cover ${className}`}
        style={{ width: s, height: s }}
      />
    );
  }

  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      className={`rounded-full flex items-center justify-center font-bold text-white ${textSizes[size]} ${className}`}
      style={{ width: s, height: s, background: getGradient(name) }}
    >
      {getInitials(name)}
    </motion.div>
  );
}
