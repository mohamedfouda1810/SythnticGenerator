import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import {
  Sparkles, ArrowDown, SplitSquareVertical, SlidersHorizontal,
  FileDown, Brain, Database, Lock, Activity, Clock, Check,
  ArrowRight, Shield, Zap, Globe, Cpu, BarChart3, Layers3
} from 'lucide-react';
import ParticleBackground from '../components/ui/ParticleBackground';
import TypewriterText from '../components/ui/TypewriterText';
import AnimatedButton from '../components/ui/AnimatedButton';
import useAuthStore from '../store/authStore';

// ─── Animation helpers ──────────────────────────────────────────

const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 }
  }
};

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } }
};

function SectionHeader({ title, subtitle, label, align = 'center' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      className={`mb-10 ${align === 'center' ? 'text-center' : 'text-left'}`}
    >
      {label && (
        <span className="inline-block px-4 py-1.5 rounded-full bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] text-[10px] font-black uppercase tracking-[0.2em] mb-4 border border-[var(--accent-primary)]/20 backdrop-blur-md">
          {label}
        </span>
      )}
      <h2 className="text-3xl md:text-4xl lg:text-5xl font-black mb-4 tracking-tight leading-tight">{title}</h2>
      {subtitle && <p className="text-[var(--text-secondary)] text-base md:text-lg max-w-2xl font-medium leading-relaxed opacity-80">{subtitle}</p>}
    </motion.div>
  );
}

// ─── Data ────────────────────────────────────────────────────────

const features = [
  { icon: Brain, title: 'Deep Learning', desc: 'State-of-the-art CTGAN models learn statistical correlations across complex datasets.', color: 'var(--accent-primary)' },
  { icon: Database, title: 'Schema Control', desc: 'Precision-engineered rule sets for building structured data from absolute zero.', color: 'var(--accent-secondary)' },
  { icon: Lock, title: 'Zero-Knowledge', desc: 'Privacy-first architecture ensures PII is never stored and remains statistically anonymized.', color: 'var(--accent-success)' },
  { icon: Activity, title: 'Quality Scores', desc: 'Real-time statistical similarity index and Jensen-Shannon divergence reports.', color: 'var(--accent-warning)' },
  { icon: FileDown, title: 'Export Engine', desc: 'High-speed CSV/XLSX generation optimized for massive machine learning workloads.', color: 'var(--accent-error)' },
  { icon: Clock, title: 'Stateful History', desc: 'Persistent cloud storage for all generation jobs with one-click re-processing.', color: '#8E87FF' },
];

const comparison = [
  { f: 'Privacy Anonymization', us: true, others: 'Partial' },
  { f: 'CTGAN Architecture', us: true, others: 'Premium Only' },
  { f: 'Custom Schema Builder', us: true, others: 'No' },
  { f: 'Statistical Verification', us: true, others: 'Basic' },
  { f: 'Free Tier Generation', us: true, others: 'Limited' },
];

const benchmarkStats = [
  { label: 'PII Shield', value: 'Column-aware', icon: Shield, tone: 'emerald' },
  { label: 'AI Modes', value: 'CTGAN + Rules', icon: Cpu, tone: 'blue' },
  { label: 'Quality Readout', value: '0-100 score', icon: BarChart3, tone: 'amber' },
];

// ─── Component ───────────────────────────────────────────────────

export default function HomePage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();

  return (
    <div className="relative bg-[var(--bg-primary)] selection:bg-[var(--accent-primary)]/30">
      
      {/* ─── HERO SECTION ───────────────────────────────── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 overflow-hidden">
        <div className="absolute inset-0 z-0 opacity-40">
          <ParticleBackground />
        </div>
        
        {/* Animated Background Gradients */}
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-[var(--accent-primary)]/10 blur-[150px] rounded-full animate-float" />
        <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-[var(--accent-secondary)]/10 blur-[150px] rounded-full animate-float" style={{ animationDelay: '-3s' }} />

        <motion.div 
          variants={staggerContainer} 
          initial="hidden" 
          animate="show" 
          className="container-xl text-center relative z-10 pt-20"
        >
          <motion.div variants={fadeInUp} className="mb-10">
            <div className="inline-flex items-center gap-3 px-6 py-2.5 rounded-2xl bg-[var(--bg-tertiary)]/50 border border-[var(--border-bright)] shadow-2xl backdrop-blur-xl">
              <span className="flex h-2 w-2 rounded-full bg-[var(--accent-success)] animate-pulse" />
              <span className="text-[10px] font-black tracking-[0.2em] text-[var(--text-primary)] uppercase">v2.0 Production Ready</span>
              <div className="w-[1px] h-4 bg-[var(--border-bright)] mx-1" />
              <span className="text-[10px] font-black tracking-[0.2em] text-[var(--accent-secondary)] uppercase">CTGAN Integrated</span>
            </div>
          </motion.div>

          <motion.h1 variants={fadeInUp} className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black mb-8 leading-tight tracking-tighter">
            Build Better Data <br />
            <span className="gradient-text h-[1.2em] overflow-hidden flex items-center justify-center">
              <TypewriterText text="statistically fast" speed={80} delay={1000} />
            </span>
          </motion.h1>

          <motion.p variants={fadeInUp} className="text-base md:text-lg lg:text-xl text-[var(--text-secondary)] mb-10 max-w-2xl mx-auto leading-relaxed font-medium opacity-80">
            The elite platform for generating high-fidelity, privacy-preserving synthetic datasets using generative AI and precision rule-based schemas.
          </motion.p>

          <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <AnimatedButton 
              onClick={() => navigate('/generate')} 
              size="lg" 
              className="min-w-[220px]"
            >
              Start Generating
            </AnimatedButton>
            <AnimatedButton 
              variant="secondary" 
              size="lg" 
              onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
              className="min-w-[180px] backdrop-blur-md"
            >
              Explore Tech
            </AnimatedButton>
          </motion.div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2 }}
          className="absolute bottom-12 left-1/2 -translate-x-1/2 text-[var(--text-tertiary)] flex flex-col items-center gap-3 cursor-pointer hover:text-[var(--text-primary)] transition-colors"
          onClick={() => document.getElementById('workflow')?.scrollIntoView({ behavior: 'smooth' })}
        >
          <span className="text-[9px] font-black uppercase tracking-[0.4em]">Scroll to Explore</span>
          <ArrowDown size={18} className="animate-bounce" />
        </motion.div>
      </section>

      {/* ─── HOW IT WORKS ───────────────────────────────── */}
      <section id="workflow" className="section-padding bg-[var(--bg-secondary)] border-y border-[var(--border-default)] relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,var(--accent-primary)_0%,transparent_20%)] opacity-5" />
        
        <div className="container-xl relative z-10">
          <SectionHeader 
            label="Workflow"
            title="Three Steps to Fidelity"
            subtitle="Our pipeline is engineered for professional speed and mathematical accuracy."
          />

          <div className="grid lg:grid-cols-3 gap-10 relative">
            {[
              { icon: SplitSquareVertical, t: 'Select Mode', d: 'Choose between AI-driven CTGAN learning from your samples or structured Mimesis logical rules.' },
              { icon: SlidersHorizontal, t: 'Define Parameters', d: 'Upload your baseline dataset or build a custom schema from 30+ distinct semantic data types.' },
              { icon: Zap, t: 'Execute & Export', d: 'Generate up to 100k records instantly and download via professional CSV or XLSX exports.' }
            ].map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.2 }}
                className="relative glass-morphism p-6 md:p-8 rounded-3xl group hover:bg-[var(--bg-tertiary)]/50"
              >
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] flex items-center justify-center mb-6 shadow-xl group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 relative">
                   <div className="absolute inset-0 rounded-2xl bg-white opacity-0 group-hover:opacity-20 transition-opacity" />
                  <step.icon size={26} className="text-white relative z-10" />
                </div>
                <div className="absolute top-6 right-6 text-5xl font-black text-[var(--text-tertiary)] opacity-[0.03] group-hover:opacity-10 transition-opacity">0{i+1}</div>
                <h3 className="text-xl font-black mb-3 tracking-tight">{step.t}</h3>
                <p className="text-[var(--text-secondary)] font-medium leading-relaxed opacity-80 text-sm">{step.d}</p>
                
                {i < 2 && (
                   <div className="hidden lg:block absolute -right-5 top-1/2 -translate-y-1/2 z-20">
                      <ArrowRight size={24} className="text-[var(--border-bright)]" />
                   </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FEATURES GRID ──────────────────────────────── */}
      <section id="features" className="section-padding relative">
        <div className="container-xl">
          <SectionHeader 
            label="Core Tech"
            title="Powerful AI Features"
            subtitle="Professional tools engineered for data scientists and ML researchers."
          />

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="glass-morphism p-6 md:p-8 rounded-3xl hover-glow transition-all duration-500 relative group overflow-hidden"
              >
                <div className="absolute -right-6 -bottom-6 opacity-[0.02] group-hover:opacity-[0.08] group-hover:scale-125 transition-all duration-700 pointer-events-none">
                  <f.icon size={120} />
                </div>
                <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-5 bg-[var(--bg-elevated)] border border-[var(--border-bright)] group-hover:border-[var(--accent-primary)]/50 transition-colors">
                  <f.icon size={22} style={{ color: f.color }} />
                </div>
                <h3 className="text-xl font-black mb-3 tracking-tight">{f.title}</h3>
                <p className="text-[var(--text-secondary)] font-medium leading-relaxed opacity-70 group-hover:opacity-100 transition-opacity text-sm">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── COMPARISON ─────────────────────────────────── */}
      <section className="section-padding bg-[linear-gradient(180deg,rgba(8,8,16,0.55),rgba(3,3,5,0.98))] border-t border-[var(--border-default)] relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.08] bg-[linear-gradient(rgba(255,255,255,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.08)_1px,transparent_1px)] bg-[size:72px_72px]" />
        <motion.div
          aria-hidden
          animate={{ x: ['-8%', '8%', '-8%'], opacity: [0.18, 0.3, 0.18] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-20 right-[-10%] h-72 w-72 rounded-full bg-[var(--accent-secondary)] blur-[120px]"
        />
        <div className="container-xl">
          <div className="grid lg:grid-cols-[0.95fr_1.05fr] gap-12 xl:gap-20 items-center relative z-10">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            >
              <SectionHeader 
                label="Benchmark"
                align="left"
                title="The SynthGen Edge"
                subtitle="A practical benchmark for synthetic data work: privacy controls, generation modes, quality signals, and export-ready output in one flow."
              />
              <div className="grid sm:grid-cols-3 gap-3 mb-8">
                {benchmarkStats.map((stat, i) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 18 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.08 }}
                    whileHover={{ y: -5, scale: 1.02 }}
                    className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-secondary)]/70 p-4 shadow-xl backdrop-blur-xl"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center">
                        <stat.icon size={16} className={
                          stat.tone === 'emerald' ? 'text-emerald-300' :
                          stat.tone === 'amber' ? 'text-amber-300' :
                          'text-blue-300'
                        } />
                      </div>
                      <span className="text-[9px] font-black uppercase tracking-[0.18em] text-[var(--text-tertiary)]">{stat.label}</span>
                    </div>
                    <p className="text-sm font-black text-[var(--text-primary)]">{stat.value}</p>
                  </motion.div>
                ))}
              </div>

              <div className="space-y-3">
                {comparison.map((item, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.06 }}
                    whileHover={{ x: 8, scale: 1.01 }}
                    className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 rounded-2xl bg-[var(--bg-tertiary)]/55 border border-[var(--border-default)] hover:border-[var(--accent-primary)]/40 transition-all group overflow-hidden"
                  >
                    <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-[var(--accent-primary)] to-[var(--accent-secondary)] opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-[var(--accent-primary)]/10 flex items-center justify-center text-[var(--accent-primary)] border border-[var(--accent-primary)]/20 group-hover:rotate-6 group-hover:scale-110 transition-transform">
                        <Shield size={18} />
                      </div>
                      <span className="font-black text-[var(--text-primary)] group-hover:text-white transition-colors">{item.f}</span>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-6">
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-400/10 border border-emerald-400/20 text-emerald-300 font-black tracking-tighter text-xs">
                        <Check size={20} />
                        SYNTHGEN
                      </div>
                      <span className="px-3 py-1.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-default)] text-[var(--text-tertiary)] font-bold text-xs min-w-[112px] text-center uppercase tracking-widest">{item.others}</span>
                    </div>
                  </motion.div>
                ))}
              </div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.35 }}
                className="mt-8 flex flex-col sm:flex-row gap-3"
              >
                <AnimatedButton onClick={() => navigate('/generate')} icon={ArrowRight} className="min-w-[210px]">
                  Run Benchmark
                </AnimatedButton>
                <button
                  onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                  className="px-5 py-3 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-secondary)]/70 text-sm font-black text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent-secondary)]/50 hover:bg-[var(--bg-tertiary)] transition-all"
                >
                  Inspect Features
                </button>
              </motion.div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, rotate: -1.5, scale: 0.94 }}
              whileInView={{ opacity: 1, rotate: 0, scale: 1 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
              className="relative rounded-[2.5rem] overflow-hidden border border-[var(--border-bright)] bg-[var(--bg-secondary)]/70 shadow-2xl group"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent-primary)]/12 via-transparent to-[var(--accent-secondary)]/12" />
              <div className="relative p-6 md:p-8">
                <div className="flex items-center justify-between mb-7">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[var(--text-tertiary)]">Live Readout</p>
                    <h3 className="text-2xl font-black mt-1">Generation Telemetry</h3>
                  </div>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
                    className="w-12 h-12 rounded-2xl bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/20 flex items-center justify-center"
                  >
                    <Layers3 size={22} className="text-[var(--accent-primary)]" />
                  </motion.div>
                </div>

                <div className="grid gap-4">
                  {[
                    { label: 'Column Privacy', value: 98, color: 'bg-emerald-400', text: 'PII filtered before model fit' },
                    { label: 'Distribution Match', value: 91, color: 'bg-blue-400', text: 'KS + TVD evaluator active' },
                    { label: 'Export Readiness', value: 100, color: 'bg-amber-300', text: 'CSV/XLSX generated from clean frame' },
                  ].map((row, i) => (
                    <motion.div
                      key={row.label}
                      initial={{ opacity: 0, y: 16 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.2 + i * 0.1 }}
                      className="p-5 rounded-2xl bg-[var(--bg-primary)]/65 border border-[var(--border-default)]"
                    >
                      <div className="flex items-center justify-between gap-4 mb-3">
                        <span className="text-sm font-black">{row.label}</span>
                        <span className="font-mono text-sm font-black text-[var(--text-secondary)]">{row.value}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          whileInView={{ width: `${row.value}%` }}
                          viewport={{ once: true }}
                          transition={{ delay: 0.35 + i * 0.1, duration: 0.9, ease: 'easeOut' }}
                          className={`h-full rounded-full ${row.color}`}
                        />
                      </div>
                      <p className="text-xs text-[var(--text-tertiary)] font-semibold mt-3">{row.text}</p>
                    </motion.div>
                  ))}
                </div>

                <div className="mt-5 grid grid-cols-3 gap-3">
                  {['CSV', 'XLSX', 'API'].map((tag, i) => (
                    <motion.div
                      key={tag}
                      whileHover={{ y: -4 }}
                      className="rounded-2xl bg-[var(--bg-tertiary)]/70 border border-[var(--border-default)] px-4 py-3 text-center"
                    >
                      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[var(--text-tertiary)]">Output {i + 1}</p>
                      <p className="text-sm font-black mt-1">{tag}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ─── CTA BANNER ─────────────────────────────────── */}
      <section className="section-padding">
        <div className="container-xl">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative glass-morphism-strong rounded-3xl p-8 md:p-14 text-center overflow-hidden border-[var(--accent-primary)]/30 border-2 shadow-[0_0_80px_rgba(108,99,255,0.15)]"
          >
            {/* Decorative Orbs */}
            <div className="absolute -top-24 -left-24 w-64 h-64 bg-[var(--accent-primary)] opacity-20 blur-[100px] rounded-full" />
            <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-[var(--accent-secondary)] opacity-20 blur-[100px] rounded-full" />

            <div className="relative z-10 max-w-4xl mx-auto">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black mb-5 leading-tight tracking-tighter">
                Ready to Architect Your <br />
                <span className="gradient-text italic">First Dataset?</span>
              </h2>
              <p className="text-base md:text-lg text-[var(--text-secondary)] mb-8 font-medium opacity-80 leading-relaxed max-w-2xl mx-auto">
                Join thousands of developers using SynthGen to accelerate their development 
                cycles without compromising on user privacy or statistical integrity.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <AnimatedButton 
                  onClick={() => navigate(isAuthenticated ? '/generate' : '/register')} 
                  size="lg" 
                  className="min-w-[240px]"
                >
                  Get Started for Free
                </AnimatedButton>
                <Link to="/history" className="text-xs font-black uppercase tracking-[0.3em] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-all flex items-center gap-3 group">
                  View Samples <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── FOOTER ─────────────────────────────────────── */}
      <footer className="bg-[var(--bg-secondary)] border-t border-[var(--border-default)] pt-16 pb-10">
        <div className="container-xl">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-10 mb-12">
            <div className="lg:col-span-2">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] rounded-xl flex items-center justify-center shadow-2xl">
                  <Sparkles size={22} className="text-white" />
                </div>
                <span className="text-xl font-black tracking-tighter">SynthGen</span>
              </div>
              <p className="text-[var(--text-secondary)] text-sm max-w-sm font-medium leading-relaxed opacity-70">
                Empowering the next generation of AI development with privacy-first synthetic data generation engines. Built for security, designed for performance.
              </p>
              <div className="flex gap-4 mt-5">
                 {/* Social links placeholder */}
                 {[Globe, Shield, Database].map((Icon, i) => (
                    <a key={i} href="#" className="w-9 h-9 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-default)] flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--accent-primary)] hover:border-[var(--accent-primary)]/50 transition-all">
                       <Icon size={16} />
                    </a>
                 ))}
              </div>
            </div>
            
            <div>
              <h4 className="text-xs font-black uppercase tracking-[0.3em] text-[var(--text-primary)] mb-5">Platform</h4>
              <ul className="space-y-3 text-sm font-bold text-[var(--text-tertiary)]">
                <li><Link to="/generate" className="hover:text-[var(--accent-primary)] transition-all flex items-center gap-2"><span>Generate Engine</span></Link></li>
                <li><Link to="/history" className="hover:text-[var(--accent-primary)] transition-all">Job History</Link></li>
                <li><Link to="/profile" className="hover:text-[var(--accent-primary)] transition-all">User Profile</Link></li>
                <li><Link to="/docs" className="hover:text-[var(--accent-primary)] transition-all">API Reference</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-xs font-black uppercase tracking-[0.3em] text-[var(--text-primary)] mb-5">Company</h4>
              <ul className="space-y-3 text-sm font-bold text-[var(--text-tertiary)]">
                <li><a href="#" className="hover:text-[var(--accent-primary)] transition-all">About Engine</a></li>
                <li><a href="#" className="hover:text-[var(--accent-primary)] transition-all">Privacy Framework</a></li>
                <li><a href="#" className="hover:text-[var(--accent-primary)] transition-all">Terms of Service</a></li>
                <li><a href="#" className="hover:text-[var(--accent-primary)] transition-all">Security Audit</a></li>
              </ul>
            </div>
          </div>
          
          <div className="pt-8 border-t border-[var(--border-default)] flex flex-col md:flex-row items-center justify-between gap-5">
            <div className="flex flex-col gap-2">
               <p className="text-[var(--text-tertiary)] text-[10px] font-black uppercase tracking-[0.4em]">
                 © 2026 SYNTHGEN AI ENGINE. ALL RIGHTS RESERVED.
               </p>
            </div>
            <div className="flex flex-wrap justify-center gap-8 text-[var(--text-tertiary)] font-bold text-[10px] uppercase tracking-widest">
              <span className="hover:text-[var(--text-primary)] transition-colors cursor-default">Mohamed Fouda </span>
              <span className="hover:text-[var(--text-primary)] transition-colors cursor-default">Mohamed W.</span>
              <span className="hover:text-[var(--text-primary)] transition-colors cursor-default">Abdelrahman</span>
              <span className="hover:text-[var(--text-primary)] transition-colors cursor-default"> Habiba</span>
              <span className="hover:text-[var(--text-primary)] transition-colors cursor-default">Amr</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
