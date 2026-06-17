import { motion } from 'framer-motion';
import { Brain, Wand2, Check, ArrowRight } from 'lucide-react';

const modes = [
  {
    id: 'ctgan',
    title: 'CTGAN Engine',
    subtitle: 'Deep Learning Model',
    description: 'Upload your real dataset and let our neural networks learn its statistical DNA to generate identical synthetic twins.',
    icon: Brain,
    color: 'var(--accent-primary)',
    bg: 'rgba(108, 99, 255, 0.05)',
  },
  {
    id: 'mimesis',
    title: 'Mimesis Engine',
    subtitle: 'Rule-Based Generator',
    description: 'Architect a custom schema from scratch. Perfect for testing edge cases or building data without an existing baseline.',
    icon: Wand2,
    color: 'var(--accent-secondary)',
    bg: 'rgba(0, 212, 255, 0.05)',
  },
];

export default function ModeSelector({ onSelect, selectedMode }) {
  return (
    <div className="w-full max-w-5xl mx-auto py-12 px-4">
      <div className="text-center mb-16">
        <h2 className="text-4xl md:text-5xl font-black mb-6">Choose Generation Engine</h2>
        <p className="text-[var(--text-secondary)] text-lg font-medium max-w-2xl mx-auto">
          Select the core technology that will drive your synthetic data generation.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {modes.map((mode) => {
          const Icon = mode.icon;
          const isSelected = selectedMode === mode.id;

          return (
            <motion.div
              key={mode.id}
              whileHover={{ y: -10 }}
              onClick={() => onSelect(mode.id)}
              className={`relative cursor-pointer group transition-all duration-500 rounded-[2.5rem] p-10 border-2 overflow-hidden ${
                isSelected 
                  ? 'border-[var(--accent-primary)] bg-[var(--bg-tertiary)] shadow-[0_0_50px_rgba(108,99,255,0.15)]' 
                  : 'border-[var(--border-default)] bg-[var(--bg-secondary)] hover:border-[var(--border-bright)]'
              }`}
            >
              {/* Background Glow */}
              <div 
                className="absolute -right-20 -bottom-20 w-64 h-64 blur-[100px] transition-opacity duration-500 rounded-full" 
                style={{ backgroundColor: mode.color, opacity: isSelected ? 0.15 : 0 }}
              />

              <div className="relative z-10">
                <div className="flex justify-between items-start mb-8">
                  <div 
                    className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-110 duration-500"
                    style={{ backgroundColor: isSelected ? mode.color : 'var(--bg-tertiary)', color: isSelected ? 'white' : mode.color }}
                  >
                    <Icon size={32} />
                  </div>
                  {isSelected && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-8 h-8 rounded-full bg-[var(--accent-success)] flex items-center justify-center text-black"
                    >
                      <Check size={18} strokeWidth={3} />
                    </motion.div>
                  )}
                </div>

                <h3 className="text-3xl font-black mb-2 tracking-tight">{mode.title}</h3>
                <p className="text-sm font-bold uppercase tracking-widest mb-6" style={{ color: mode.color }}>{mode.subtitle}</p>
                <p className="text-[var(--text-secondary)] font-medium leading-relaxed mb-10 text-lg">
                  {mode.description}
                </p>

                <div className={`flex items-center gap-2 font-bold text-sm transition-all duration-300 ${isSelected ? 'text-[var(--text-primary)]' : 'text-[var(--text-tertiary)] group-hover:text-[var(--text-secondary)]'}`}>
                  {isSelected ? 'Engine Selected' : 'Configure Engine'}
                  <ArrowRight size={16} className={`transition-transform duration-300 ${isSelected ? 'translate-x-1' : 'group-hover:translate-x-1'}`} />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
