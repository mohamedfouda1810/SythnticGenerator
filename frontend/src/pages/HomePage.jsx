import { useRef, useEffect, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import {
  Sparkles, Shield, Cpu, Download, ArrowRight, ArrowDown,
  SplitSquareVertical, SlidersHorizontal, FileDown,
  Brain, Grid3X3, BarChart3, FileSpreadsheet, Clock,
  Check, X as XIcon, Zap,
} from 'lucide-react';
import ParticleBackground from '../components/ui/ParticleBackground';
import TypewriterText from '../components/ui/TypewriterText';
import AnimatedButton from '../components/ui/AnimatedButton';
import GlowCard from '../components/ui/GlowCard';
import useAuthStore from '../store/authStore';

// ─── Animation helpers ──────────────────────────────────────────

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.1, delayChildren: 0.2 } } };
const fadeUp = { hidden: { opacity: 0, y: 30 }, show: { opacity: 1, y: 0, transition: { duration: 0.6 } } };

function AnimatedCounter({ target, suffix = '', duration = 2 }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const step = Math.ceil(target / (duration * 60));
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setCount(target); clearInterval(timer); }
      else setCount(start);
    }, 1000 / 60);
    return () => clearInterval(timer);
  }, [inView, target, duration]);

  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
}

function SectionTitle({ title, subtitle }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="text-center mb-12"
    >
      <h2 className="text-3xl md:text-4xl font-bold mb-3">{title}</h2>
      {subtitle && <p className="text-[var(--text-secondary)] max-w-2xl mx-auto">{subtitle}</p>}
    </motion.div>
  );
}

// ─── Data ────────────────────────────────────────────────────────

const stats = [
  { label: 'Generation Modes', value: 2, icon: Zap },
  { label: 'Privacy Safe', value: 100, suffix: '%', icon: Shield },
  { label: 'Rows Supported', value: 50000, suffix: '+', icon: Grid3X3 },
  { label: 'Real-time Preview', value: null, icon: BarChart3 },
];

const steps = [
  { icon: SplitSquareVertical, title: 'Choose Your Mode', desc: 'Select CTGAN to learn from your data, or Mimesis to build from scratch' },
  { icon: SlidersHorizontal, title: 'Configure & Generate', desc: 'Set your parameters and let our AI do the heavy lifting' },
  { icon: FileDown, title: 'Download & Use', desc: 'Preview your synthetic data and download in CSV format' },
];

const features = [
  { icon: Brain, title: 'CTGAN Generation', desc: 'Upload your real dataset and our AI learns its statistical patterns to generate realistic synthetic data', color: '#A855F7' },
  { icon: Grid3X3, title: 'Rule-Based Generation', desc: 'Define custom schemas and generate structured datasets without needing any real data', color: '#00D4FF' },
  { icon: Shield, title: 'Privacy Preserved', desc: 'PII automatically detected and removed. Your data never leaves our secure pipeline', color: '#22C55E' },
  { icon: BarChart3, title: 'Quality Metrics', desc: 'Every generated dataset comes with statistical quality scores and similarity reports', color: '#F59E0B' },
  { icon: FileSpreadsheet, title: 'Multiple Formats', desc: 'Download your synthetic data as CSV or Excel, ready to use in any tool or framework', color: '#EC4899' },
  { icon: Clock, title: 'Generation History', desc: 'All your previous generations saved with full details and re-download capability', color: '#3B82F6' },
];

const comparison = [
  { feature: 'Free to Use',        us: true, gretel: false, mostly: false, faker: true },
  { feature: 'CTGAN Support',      us: true, gretel: true,  mostly: true,  faker: false },
  { feature: 'Rule-Based',         us: true, gretel: false, mostly: false, faker: true },
  { feature: 'Quality Metrics',    us: true, gretel: true,  mostly: true,  faker: false },
  { feature: 'No Expertise Needed',us: true, gretel: false, mostly: true,  faker: true },
  { feature: 'Privacy Preserving', us: true, gretel: true,  mostly: true,  faker: false },
  { feature: 'Web Interface',      us: true, gretel: true,  mostly: true,  faker: false },
];

// ─── Component ───────────────────────────────────────────────────

export default function HomePage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();

  return (
    <div className="relative" style={{ position: 'relative' }}>

      {/* ─── HERO ───────────────────────────────────────── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-16 overflow-hidden">
        {/* Particles scoped to hero only */}
        <div className="absolute inset-0" style={{ zIndex: 0 }}>
          <ParticleBackground />
        </div>
        <motion.div variants={stagger} initial="hidden" animate="show" className="text-center max-w-3xl mx-auto" style={{ position: 'relative', zIndex: 1 }}>
          <motion.div variants={fadeUp} className="flex justify-center mb-8">
            <motion.div
              animate={{ y: [0, -6, 0], rotate: [0, 5, 0, -5, 0] }}
              transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/20"
            >
              <Sparkles size={16} className="text-[var(--accent-primary)]" />
              <span className="text-sm font-medium text-[var(--accent-primary)]">AI Synthetic Data Platform</span>
            </motion.div>
          </motion.div>

          <motion.h1 variants={fadeUp} className="text-5xl md:text-7xl font-extrabold leading-tight mb-6">
            {'Generate Synthetic Data'.split(' ').map((word, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + i * 0.1, duration: 0.5 }}
                className={i >= 1 ? ' gradient-text' : ''}
              >
                {word}{' '}
              </motion.span>
            ))}
            <br />
            <span className="gradient-text">
              <TypewriterText text="with AI" speed={80} delay={1200} />
            </span>
          </motion.h1>

          <motion.p variants={fadeUp} className="text-lg md:text-xl text-[var(--text-secondary)] mb-10 max-w-xl mx-auto leading-relaxed">
            Privacy-preserving. Statistically accurate. Instantly ready.
          </motion.p>

          <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <AnimatedButton onClick={() => navigate('/generate')} icon={Sparkles} size="lg">
              Start Generating
            </AnimatedButton>
            <AnimatedButton
              onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
              variant="secondary" size="lg" icon={ArrowRight}
            >
              Learn More
            </AnimatedButton>
          </motion.div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 text-[var(--text-tertiary)]"
          style={{ zIndex: 1 }}
        >
          <ArrowDown size={24} />
        </motion.div>
      </section>

      {/* ─── STATS BAR ──────────────────────────────────── */}
      <section className="relative py-16 px-6" style={{ zIndex: 1, background: 'var(--bg-primary)' }}>
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="text-center p-6 rounded-2xl bg-[var(--bg-secondary)]/60 backdrop-blur border border-[var(--border-default)]"
            >
              <s.icon size={28} className="text-[var(--accent-primary)] mx-auto mb-3" />
              <p className="text-3xl font-bold mb-1">
                {s.value !== null ? <AnimatedCounter target={s.value} suffix={s.suffix} /> : '✓'}
              </p>
              <p className="text-sm text-[var(--text-secondary)]">{s.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ─── HOW IT WORKS ───────────────────────────────── */}
      <section className="relative py-20 px-6" style={{ zIndex: 1, background: 'var(--bg-primary)' }}>
        <SectionTitle title="How It Works" subtitle="Get synthetic data in three simple steps" />
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8 relative">
            {/* Connecting line */}
            <div className="hidden md:block absolute top-12 left-[17%] right-[17%] h-0.5">
              <motion.div
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 1, delay: 0.5 }}
                className="h-full bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] origin-left"
              />
            </div>
            {steps.map((s, i) => (
              <motion.div
                key={s.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 + i * 0.2 }}
                className="text-center relative"
              >
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-[var(--accent-primary)]/20 to-[var(--accent-secondary)]/20 border border-[var(--accent-primary)]/30 flex items-center justify-center mx-auto mb-5">
                  <s.icon size={36} className="text-[var(--accent-primary)]" />
                </div>
                <span className="text-xs font-bold text-[var(--accent-primary)] mb-2 block">STEP {i + 1}</span>
                <h3 className="text-lg font-semibold mb-2">{s.title}</h3>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FEATURES ───────────────────────────────────── */}
      <section id="features" className="relative py-20 px-6" style={{ zIndex: 1, background: 'var(--bg-primary)' }}>
        <SectionTitle title="Powerful Features" subtitle="Everything you need for synthetic data generation" />
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
            >
              <motion.div
                whileHover={{ y: -8 }}
                className="h-full p-6 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-default)] hover:border-opacity-60 transition-all group"
                style={{ '--card-color': f.color }}
              >
                <motion.div
                  whileHover={{ rotate: 10 }}
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: `${f.color}20` }}
                >
                  <f.icon size={24} style={{ color: f.color }} />
                </motion.div>
                <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed" style={{ flex: 1 }}>{f.desc}</p>
              </motion.div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ─── COMPARISON TABLE ───────────────────────────── */}
      <section className="relative py-20 px-6" style={{ zIndex: 1, background: 'var(--bg-primary)' }}>
        <SectionTitle title="Why Choose Us?" subtitle="See how SynthGen compares to the competition" />
        <div className="max-w-4xl mx-auto">
          <div className="rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-default)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm" style={{ minWidth: '560px' }}>
                <thead>
                  <tr className="border-b border-[var(--border-default)]">
                    <th className="text-left px-6 py-4 font-medium text-[var(--text-secondary)]">Feature</th>
                    <th className="text-center px-4 py-4 font-bold text-[var(--accent-primary)]">SynthGen</th>
                    <th className="text-center px-4 py-4 font-medium text-[var(--text-secondary)]">Gretel.ai</th>
                    <th className="text-center px-4 py-4 font-medium text-[var(--text-secondary)]">MostlyAI</th>
                    <th className="text-center px-4 py-4 font-medium text-[var(--text-secondary)]">Faker</th>
                  </tr>
                </thead>
                <tbody>
                  {comparison.map((row, i) => (
                    <motion.tr
                      key={row.feature}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.05 }}
                      className="border-b border-[var(--border-default)] last:border-0"
                    >
                      <td className="px-6 py-3 font-medium">{row.feature}</td>
                      {[row.us, row.gretel, row.mostly, row.faker].map((v, ci) => (
                        <td key={ci} className="text-center px-4 py-3">
                          <motion.span
                            initial={{ scale: 0 }}
                            whileInView={{ scale: 1 }}
                            viewport={{ once: true }}
                            transition={{ type: 'spring', delay: i * 0.05 + 0.2 }}
                          >
                            {v ? (
                              <Check size={18} className={ci === 0 ? 'text-[var(--accent-success)] mx-auto' : 'text-[var(--text-tertiary)] mx-auto'} />
                            ) : (
                              <XIcon size={18} className="text-[var(--text-tertiary)]/40 mx-auto" />
                            )}
                          </motion.span>
                        </td>
                      ))}
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* ─── CTA BANNER ─────────────────────────────────── */}
      <section className="relative py-20 px-6" style={{ zIndex: 1, background: 'var(--bg-primary)', position: 'relative' }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto rounded-3xl p-12 text-center relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(168,85,247,0.15), rgba(0,212,255,0.15))',
            border: '1px solid rgba(168,85,247,0.3)',
          }}
        >
          <motion.div
            animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
            transition={{ repeat: Infinity, duration: 6, ease: 'linear' }}
            className="absolute inset-0 opacity-20"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(168,85,247,0.3), transparent)',
              backgroundSize: '200% 100%',
            }}
          />
          <div className="relative z-10">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to generate your first synthetic dataset?
            </h2>
            <p className="text-[var(--text-secondary)] mb-8 max-w-lg mx-auto">
              Join SynthGen and start creating privacy-safe datasets in seconds. Free forever.
            </p>
            <AnimatedButton
              onClick={() => navigate(isAuthenticated ? '/generate' : '/register')}
              icon={Sparkles}
              size="lg"
            >
              Get Started Now
            </AnimatedButton>
          </div>
        </motion.div>
      </section>

      {/* ─── FOOTER ─────────────────────────────────────── */}
      <footer className="relative border-t border-[var(--border-default)] py-12 px-6" style={{ zIndex: 1, background: 'var(--bg-primary)' }}>
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Sparkles size={20} className="text-[var(--accent-primary)]" />
                <span className="text-lg font-bold gradient-text">SynthGen</span>
              </div>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                AI-Powered Synthetic Data Generation Platform for privacy-safe dataset creation.
              </p>
            </div>
            <div>
              <h4 className="text-sm font-semibold mb-3">Navigation</h4>
              <div className="space-y-2 text-sm text-[var(--text-secondary)]">
                <Link to="/" className="block hover:text-[var(--text-primary)]">Home</Link>
                <Link to="/generate" className="block hover:text-[var(--text-primary)]">Generate</Link>
                <Link to="/history" className="block hover:text-[var(--text-primary)]">History</Link>
                <Link to="/login" className="block hover:text-[var(--text-primary)]">Login</Link>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-semibold mb-3">Project Info</h4>
              <div className="space-y-2 text-sm text-[var(--text-secondary)]">
                <p>Faculty of Computers and Information Technology</p>
                <p>Supervisor: Dr. Yasser Kamal</p>
                <p>Academic Year 2025–2026</p>
              </div>
            </div>
          </div>
          <div className="pt-6 border-t border-[var(--border-default)] text-center text-xs text-[var(--text-tertiary)]">
            <p>© 2026 SynthGen — Built by Habiba, Abdelrahman, Mohamed W., Mohamed E., and Amr</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
