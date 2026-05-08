import { motion } from 'framer-motion';
import { Brain, Wand2, Check } from 'lucide-react';
import GlowCard from '../ui/GlowCard';

const modes = [
  {
    id: 'ctgan',
    title: 'CTGAN',
    subtitle: 'AI-Powered Generation',
    description: 'Upload your real dataset and let our AI learn its statistical patterns to generate new synthetic rows that preserve the original distributions.',
    icon: Brain,
    glowColor: 'purple',
    features: ['Learns from your data', 'Preserves correlations', 'Quality evaluation included'],
  },
  {
    id: 'mimesis',
    title: 'Mimesis',
    subtitle: 'Rule-Based Generation',
    description: 'Build a custom schema with 25+ field types — names, dates, medical data, financial info — and instantly generate realistic synthetic datasets.',
    icon: Wand2,
    glowColor: 'cyan',
    features: ['25+ field types', 'Instant generation', 'No data upload needed'],
  },
];

const containerVariants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.15 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 40 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 200, damping: 20 } },
};

export default function ModeSelector({ onSelect, selectedMode }) {
  return (
    <div className="w-full max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-10"
      >
        <h2 className="text-3xl font-bold mb-3">Choose Generation Mode</h2>
        <p className="text-[var(--text-secondary)] text-lg">
          Select how you want to create your synthetic dataset
        </p>
      </motion.div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid md:grid-cols-2 gap-6"
      >
        {modes.map((mode) => {
          const Icon = mode.icon;
          const isSelected = selectedMode === mode.id;

          return (
            <motion.div key={mode.id} variants={cardVariants}>
              <GlowCard
                glowColor={mode.glowColor}
                selected={isSelected}
                onClick={() => onSelect(mode.id)}
                className="h-full"
              >
                <div className="flex flex-col h-full">
                  {/* Icon */}
                  <motion.div
                    className="w-14 h-14 rounded-xl flex items-center justify-center mb-5"
                    style={{
                      background: mode.glowColor === 'purple'
                        ? 'rgba(108, 99, 255, 0.15)'
                        : 'rgba(0, 212, 255, 0.15)',
                    }}
                    whileHover={{ rotate: 10 }}
                  >
                    <Icon
                      size={28}
                      style={{
                        color: mode.glowColor === 'purple'
                          ? 'var(--accent-primary)'
                          : 'var(--accent-secondary)',
                      }}
                    />
                  </motion.div>

                  {/* Title */}
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-xl font-bold">{mode.title}</h3>
                    {isSelected && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 15 }}
                      >
                        <Check size={20} className="text-[var(--accent-success)]" />
                      </motion.div>
                    )}
                  </div>
                  <p className="text-sm text-[var(--accent-primary)] font-medium mb-3">
                    {mode.subtitle}
                  </p>
                  <p className="text-sm text-[var(--text-secondary)] mb-5 leading-relaxed">
                    {mode.description}
                  </p>

                  {/* Features */}
                  <div className="mt-auto space-y-2">
                    {mode.features.map((feat, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 + i * 0.1 }}
                        className="flex items-center gap-2 text-sm text-[var(--text-secondary)]"
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)]" />
                        {feat}
                      </motion.div>
                    ))}
                  </div>
                </div>
              </GlowCard>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}
