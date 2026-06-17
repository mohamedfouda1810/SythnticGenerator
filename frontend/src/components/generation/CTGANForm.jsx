import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileSpreadsheet, X, Zap, Settings2, Info, ShieldCheck, ShieldAlert, EyeOff } from 'lucide-react';
import AnimatedButton from '../ui/AnimatedButton';
import { formatFileSize } from '../../utils/formatters';

function SliderInput({ label, value, onChange, min, max, step = 1, icon: Icon }) {
  const percentage = ((value - min) / (max - min)) * 100;
  
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {Icon && <Icon size={14} className="text-[var(--text-tertiary)]" />}
          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-tertiary)]">{label}</label>
        </div>
        <div className="px-3 py-1 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-default)] font-mono text-sm font-black text-[var(--accent-primary)]">
          {value.toLocaleString()}
        </div>
      </div>
      
      <div className="relative h-6 flex items-center">
        <div className="absolute w-full h-1.5 bg-[var(--bg-primary)] rounded-full overflow-hidden border border-[var(--border-default)]">
          <motion.div 
            className="h-full bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)]"
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ type: 'spring', stiffness: 100 }}
          />
        </div>
        <input
          type="range"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          min={min}
          max={max}
          step={step}
          className="absolute w-full h-full opacity-0 cursor-pointer z-10"
        />
        <motion.div 
          className="absolute w-5 h-5 bg-white rounded-full shadow-[0_0_15px_rgba(108,99,255,0.4)] border-2 border-[var(--accent-primary)] pointer-events-none z-0"
          animate={{ left: `calc(${percentage}% - 10px)` }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
      </div>
      
      <div className="flex justify-between px-1">
        <span className="text-[9px] font-bold text-[var(--text-tertiary)] uppercase">{min.toLocaleString()}</span>
        <span className="text-[9px] font-bold text-[var(--text-tertiary)] uppercase">{max.toLocaleString()}</span>
      </div>
    </div>
  );
}

export default function CTGANForm({ onSubmit, isGenerating }) {
  const [file, setFile] = useState(null);
  const [numRows, setNumRows] = useState(1000);
  const [epochs, setEpochs] = useState(50);
  const [removePII, setRemovePII] = useState(true);

  const onDrop = useCallback((accepted) => {
    if (accepted.length > 0) {
      setFile(accepted[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    },
    maxFiles: 1,
    maxSize: 20 * 1024 * 1024, // 20MB
  });

  const handleSubmit = () => {
    if (!file) return;
    onSubmit(file, numRows, epochs, removePII);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full max-w-6xl mx-auto grid lg:grid-cols-12 gap-10"
    >
      {/* Left: Upload Area */}
      <div className="lg:col-span-7">
        <div
          {...getRootProps()}
          className={`relative group rounded-[3rem] p-1 border-2 border-dashed transition-all duration-500 min-h-[450px] flex flex-col items-center justify-center cursor-pointer overflow-hidden ${
            isDragActive 
              ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/5' 
              : 'border-[var(--border-default)] bg-[var(--bg-secondary)]/30 hover:border-[var(--border-bright)] hover:bg-[var(--bg-secondary)]/50'
          }`}
        >
          <input {...getInputProps()} />
          
          {/* Decorative Background Elements */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,var(--accent-primary)_0%,transparent_60%)] opacity-[0.03] pointer-events-none" />

          <AnimatePresence mode="wait">
            {file ? (
              <motion.div
                key="file-active"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative z-10 flex flex-col items-center text-center p-10"
              >
                <div className="relative mb-8">
                  <motion.div
                    animate={{ rotate: [0, 5, -5, 0] }}
                    transition={{ repeat: Infinity, duration: 4 }}
                    className="w-24 h-24 rounded-[2rem] bg-gradient-to-br from-[var(--accent-success)] to-[#00D4FF] flex items-center justify-center shadow-2xl"
                  >
                    <FileSpreadsheet size={48} className="text-white" />
                  </motion.div>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={(e) => { e.stopPropagation(); setFile(null); }}
                    className="absolute -top-3 -right-3 w-10 h-10 rounded-full bg-red-500 text-white flex items-center justify-center shadow-xl border-4 border-[var(--bg-primary)] hover:bg-red-600 transition-colors"
                  >
                    <X size={20} strokeWidth={3} />
                  </motion.button>
                </div>

                <h3 className="text-2xl font-black mb-2 tracking-tight">{file.name}</h3>
                <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-default)] mb-8">
                   <span className="text-xs font-black uppercase tracking-widest text-[var(--accent-success)]">{formatFileSize(file.size)}</span>
                   <div className="w-1 h-1 rounded-full bg-[var(--border-bright)]" />
                   <span className="text-xs font-black uppercase tracking-widest text-[var(--text-tertiary)]">Ready for learning</span>
                </div>

                <p className="text-[var(--text-secondary)] text-sm max-w-sm font-medium leading-relaxed opacity-60">
                  Our CTGAN engine will now analyze the multivariate correlations within this file.
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="upload-empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="relative z-10 flex flex-col items-center text-center p-12"
              >
                <div className="w-24 h-24 rounded-[2.5rem] bg-[var(--bg-tertiary)] border border-[var(--border-bright)] flex items-center justify-center mb-10 group-hover:scale-110 group-hover:border-[var(--accent-primary)]/50 transition-all duration-500 shadow-xl">
                  <Upload size={40} className={`transition-colors duration-500 ${isDragActive ? 'text-[var(--accent-primary)]' : 'text-[var(--text-tertiary)]'}`} />
                </div>
                
                <h3 className="text-3xl font-black mb-4 tracking-tight">
                  {isDragActive ? 'Drop your data' : 'Upload Source File'}
                </h3>
                <p className="text-[var(--text-secondary)] text-lg font-medium max-w-xs mb-10 opacity-70">
                  Drag and drop your baseline CSV or XLSX to begin the AI learning process.
                </p>

                <div className="flex flex-wrap justify-center gap-4">
                  {['CSV', 'XLSX', 'MAX 20MB'].map((tag) => (
                    <span key={tag} className="px-5 py-2 rounded-xl bg-[var(--bg-tertiary)]/50 border border-[var(--border-default)] text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-tertiary)]">
                      {tag}
                    </span>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Right: Params Sidebar */}
      <div className="lg:col-span-5">
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-[3rem] p-10 shadow-2xl sticky top-24 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5">
             <Settings2 size={120} />
          </div>

          <div className="relative z-10">
            <div className="flex items-center gap-4 mb-12">
              <div className="w-12 h-12 rounded-2xl bg-[var(--accent-primary)]/10 flex items-center justify-center">
                <Settings2 size={24} className="text-[var(--accent-primary)]" />
              </div>
              <div>
                <h3 className="text-xl font-black tracking-tight">Configuration</h3>
                <p className="text-[10px] font-black text-[var(--text-tertiary)] uppercase tracking-widest mt-1">AI Engine Parameters</p>
              </div>
            </div>

            <div className="space-y-12">
              <SliderInput
                label="Synthetic Rows"
                value={numRows}
                onChange={setNumRows}
                min={100}
                max={20000}
                step={100}
                icon={Zap}
              />

              <SliderInput
                label="Training Cycles"
                value={epochs}
                onChange={setEpochs}
                min={1}
                max={200}
                step={1}
                icon={Settings2}
              />

              {/* PII Toggle */}
              <div
                className={`relative overflow-hidden p-5 rounded-2xl border transition-all duration-500 ${
                  removePII
                    ? 'bg-emerald-500/[0.06] border-emerald-400/30 shadow-[0_0_30px_rgba(16,185,129,0.08)]'
                    : 'bg-amber-500/[0.06] border-amber-400/30'
                }`}
              >
                <div className="absolute -right-8 -top-8 opacity-10">
                  {removePII ? <ShieldCheck size={120} /> : <ShieldAlert size={120} />}
                </div>
                <div className="relative z-10 flex items-center justify-between gap-5">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${removePII ? 'bg-emerald-400/15 text-emerald-300' : 'bg-amber-400/15 text-amber-300'}`}>
                      {removePII ? <EyeOff size={20} /> : <ShieldAlert size={20} />}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-primary)]">Privacy Protection</span>
                      <span className="text-[11px] text-[var(--text-secondary)] font-semibold leading-relaxed mt-1">
                        {removePII
                          ? 'PII-like columns are removed before CTGAN training and export.'
                          : 'All columns are used, including identifiers and personal fields.'}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={removePII}
                    aria-label="Toggle privacy protection"
                    onClick={() => setRemovePII((value) => !value)}
                    className={`w-16 h-8 rounded-full transition-all duration-300 relative shrink-0 border ${
                      removePII
                        ? 'bg-emerald-500 border-emerald-300/40 shadow-[0_0_18px_rgba(16,185,129,0.35)]'
                        : 'bg-amber-700/60 border-amber-300/30'
                    }`}
                  >
                    <motion.div
                      animate={{ x: removePII ? 32 : 4 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 28 }}
                      className="absolute top-1 w-6 h-6 bg-white rounded-full shadow-lg"
                    />
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-12 p-6 rounded-2xl bg-[var(--bg-tertiary)]/50 border border-[var(--border-default)] flex gap-4">
               <Info size={18} className="text-[var(--accent-primary)] shrink-0" />
               <p className="text-[11px] font-medium leading-relaxed text-[var(--text-secondary)] opacity-80">
                  Increasing training cycles (epochs) improves statistical fidelity but extends generation time. We recommend 150+ for complex datasets.
               </p>
            </div>

            <div className="mt-12">
              <AnimatedButton
                onClick={handleSubmit}
                disabled={!file || isGenerating}
                loading={isGenerating}
                icon={Zap}
                size="lg"
                className="w-full"
              >
                Launch CTGAN Engine
              </AnimatedButton>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
