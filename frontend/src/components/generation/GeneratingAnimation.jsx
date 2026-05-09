import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Grid3X3, CheckCircle2, Loader2, BarChart3, Sparkles } from 'lucide-react';

/* ───────────────────────────────────────────────────────────
   Status → phase mapping
   ─────────────────────────────────────────────────────────── */
const PHASE_MAP = {
  uploading:  0,
  analyzing:  1,
  training:   2,
  generating: 3,
  evaluating: 4,
};

const PHASES = [
  { key: 'analyzing',  label: 'Analyzing Data',         icon: BarChart3 },
  { key: 'training',   label: 'Training AI Model',      icon: Brain },
  { key: 'generating', label: 'Generating Synthetic Data', icon: Sparkles },
  { key: 'evaluating', label: 'Quality Evaluation',     icon: CheckCircle2 },
];

const MIMESIS_PHASES = [
  { key: 'uploading',  label: 'Building Schema',        icon: Grid3X3 },
  { key: 'generating', label: 'Generating Data',        icon: Sparkles },
];

/* ───────────────────────────────────────────────────────────
   Animated counter
   ─────────────────────────────────────────────────────────── */
function CountUp({ end, duration = 2000, prefix = '', suffix = '' }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (end === 0) return;
    const start = performance.now();
    function tick(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setVal(Math.floor(eased * end));
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }, [end, duration]);
  return <span className="font-mono tabular-nums">{prefix}{val.toLocaleString()}{suffix}</span>;
}

/* ───────────────────────────────────────────────────────────
   Matrix rain character column
   ─────────────────────────────────────────────────────────── */
function MatrixColumn({ left, delay }) {
  const chars = '01アイウエオカキクケコ';
  const [text, setText] = useState('');
  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      setText(prev => prev + chars[Math.floor(Math.random() * chars.length)] + '\n');
      i++;
      if (i > 30) {
        clearInterval(interval);
      }
    }, 80);
    return () => clearInterval(interval);
  }, []); // eslint-disable-line

  return (
    <motion.div
      initial={{ opacity: 0, y: -100 }}
      animate={{ opacity: [0, 0.3, 0], y: ['0%', '100%'] }}
      transition={{ duration: 4, delay, repeat: Infinity, ease: 'linear' }}
      className="absolute top-0 text-[var(--accent-success)] text-xs font-mono whitespace-pre leading-tight pointer-events-none select-none"
      style={{ left: `${left}%`, opacity: 0.15 }}
    >
      {text}
    </motion.div>
  );
}

/* ───────────────────────────────────────────────────────────
   Neural network SVG
   ─────────────────────────────────────────────────────────── */
function NeuralNetworkSVG({ activePhase }) {
  const layers = [3, 5, 5, 3];
  const width = 280;
  const height = 200;
  const layerSpacing = width / (layers.length + 1);

  const nodes = [];
  const edges = [];

  layers.forEach((count, li) => {
    const x = layerSpacing * (li + 1);
    const ySpacing = height / (count + 1);
    const layerNodes = [];
    for (let ni = 0; ni < count; ni++) {
      const y = ySpacing * (ni + 1);
      layerNodes.push({ x, y, id: `${li}-${ni}` });
    }
    nodes.push(layerNodes);
  });

  // Build edges
  for (let li = 0; li < nodes.length - 1; li++) {
    for (const n1 of nodes[li]) {
      for (const n2 of nodes[li + 1]) {
        edges.push({ from: n1, to: n2, key: `${n1.id}-${n2.id}` });
      }
    }
  }

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full max-w-[280px] mx-auto">
      {/* Edges */}
      {edges.map((e, i) => (
        <motion.line
          key={e.key}
          x1={e.from.x} y1={e.from.y}
          x2={e.to.x} y2={e.to.y}
          stroke="var(--accent-primary)"
          strokeWidth={0.5}
          initial={{ pathLength: 0, opacity: 0.1 }}
          animate={{ pathLength: 1, opacity: [0.1, 0.4, 0.1] }}
          transition={{ duration: 2, delay: i * 0.02, repeat: Infinity }}
        />
      ))}
      {/* Nodes */}
      {nodes.flat().map((n, i) => (
        <motion.circle
          key={n.id}
          cx={n.x} cy={n.y} r={4}
          fill="var(--bg-secondary)"
          stroke="var(--accent-primary)"
          strokeWidth={1.5}
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.6, 1, 0.6],
          }}
          transition={{ duration: 1.5, delay: i * 0.08, repeat: Infinity }}
        />
      ))}
    </svg>
  );
}

/* ───────────────────────────────────────────────────────────
   Progress Ring
   ─────────────────────────────────────────────────────────── */
function ProgressRing({ progress, size = 120 }) {
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      {/* Outer rotating ring */}
      <motion.div
        className="absolute inset-0"
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 8, ease: 'linear' }}
      >
        <svg width={size} height={size}>
          <circle
            cx={size / 2} cy={size / 2} r={radius + 8}
            fill="none"
            stroke="var(--accent-primary)"
            strokeWidth={1}
            strokeDasharray="8 12"
            opacity={0.3}
          />
        </svg>
      </motion.div>

      {/* Progress ring */}
      <svg width={size} height={size} className="absolute inset-0 -rotate-90">
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none"
          stroke="var(--bg-tertiary)"
          strokeWidth={strokeWidth}
        />
        <motion.circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none"
          stroke="url(#progressGradient)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
        <defs>
          <linearGradient id="progressGradient">
            <stop offset="0%" stopColor="var(--accent-primary)" />
            <stop offset="100%" stopColor="var(--accent-secondary)" />
          </linearGradient>
        </defs>
      </svg>

      {/* Center icon */}
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
        >
          <Brain size={28} className="text-[var(--accent-primary)]" />
        </motion.div>
      </div>
    </div>
  );
}

/* ───────────────────────────────────────────────────────────
   Main GeneratingAnimation
   ─────────────────────────────────────────────────────────── */
export default function GeneratingAnimation({ status, mode }) {
  const phaseIndex = PHASE_MAP[status] ?? 0;
  const phases = mode === 'ctgan' ? PHASES : MIMESIS_PHASES;
  const progress = Math.min(((phaseIndex + 1) / phases.length) * 100, 100);

  // Animated stats
  const [rows, setRows] = useState(0);
  const [patterns, setPatterns] = useState(0);
  const [epoch, setEpoch] = useState(0);

  useEffect(() => {
    if (status === 'analyzing') setRows(500);
    if (status === 'training') { setPatterns(24); setEpoch(100); }
    if (status === 'generating') setRows(1000);
  }, [status]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--bg-primary)]/95 backdrop-blur-md"
    >
      {/* Matrix rain background (subtle) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 12 }).map((_, i) => (
          <MatrixColumn key={i} left={5 + i * 8} delay={i * 0.3} />
        ))}
      </div>

      <div className="relative z-10 flex flex-col items-center gap-8 px-6 max-w-lg">
        {/* Progress Ring */}
        <ProgressRing progress={progress} />

        {/* Phase indicator */}
        <div className="space-y-2 text-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={status}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="text-xl font-semibold gradient-text"
            >
              {phases[Math.min(phaseIndex, phases.length - 1)]?.label || 'Processing'}
            </motion.div>
          </AnimatePresence>

          <motion.div
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="text-sm text-[var(--text-secondary)] flex items-center justify-center gap-2"
          >
            <Loader2 size={14} className="animate-spin" />
            Please wait...
          </motion.div>

          {/* Time estimate (CTGAN training phase) */}
          {mode === 'ctgan' && status === 'training' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-3 space-y-2"
            >
              <p className="text-xs text-[var(--text-tertiary)]">
                ⚡ Training {epoch} epochs — this may take a few minutes
              </p>
              <div className="w-48 mx-auto h-1 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)]"
                  style={{ originX: 0 }}
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 120, ease: 'linear' }}
                />
              </div>
            </motion.div>
          )}
        </div>

        {/* Animated Stats (CTGAN only) */}
        {mode === 'ctgan' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="grid grid-cols-3 gap-4 w-full"
          >
            {[
              { label: 'Rows Analyzed', value: rows },
              { label: 'Patterns Found', value: patterns },
              { label: 'Epoch', value: epoch },
            ].map((stat) => (
              <div
                key={stat.label}
                className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-xl p-3 text-center"
              >
                <div className="text-lg font-bold text-[var(--accent-primary)]">
                  <CountUp end={stat.value} />
                </div>
                <div className="text-xs text-[var(--text-tertiary)]">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        )}

        {/* Neural Network Visualization (CTGAN analyzing/training phases) */}
        {mode === 'ctgan' && (status === 'analyzing' || status === 'training') && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full"
          >
            <NeuralNetworkSVG activePhase={phaseIndex} />
          </motion.div>
        )}

        {/* Step indicators */}
        <div className="flex items-center gap-2">
          {phases.map((p, i) => (
            <motion.div
              key={p.key}
              className="flex items-center gap-1.5"
            >
              <motion.div
                className="w-2 h-2 rounded-full"
                animate={{
                  backgroundColor: i <= phaseIndex ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                  scale: i === phaseIndex ? [1, 1.3, 1] : 1,
                }}
                transition={{ duration: 0.3, ...(i === phaseIndex ? { repeat: Infinity, duration: 1 } : {}) }}
              />
              {i < phases.length - 1 && (
                <div
                  className="w-6 h-0.5 rounded"
                  style={{ backgroundColor: i < phaseIndex ? 'var(--accent-primary)' : 'var(--bg-tertiary)' }}
                />
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
