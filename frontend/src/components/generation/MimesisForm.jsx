import { useState } from 'react';
import { motion } from 'framer-motion';
import { Wand2, Settings2, Info, Layers } from 'lucide-react';
import AnimatedButton from '../ui/AnimatedButton';
import SchemaBuilder from './SchemaBuilder';

const defaultSchema = {
  user_name: { type: 'name', options: {} },
  user_age: { type: 'age', options: { min: 18, max: 75 } },
  email_address: { type: 'email', options: {} },
  department: { type: 'category', options: { choices: ['Engineering', 'Marketing', 'Sales', 'Design'] } },
};

export default function MimesisForm({ onSubmit, isGenerating }) {
  const [schema, setSchema] = useState(defaultSchema);
  const [numRows, setNumRows] = useState(5000);

  const handleSubmit = () => {
    if (Object.keys(schema).length === 0) return;
    onSubmit(schema, numRows);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full max-w-7xl mx-auto grid lg:grid-cols-12 gap-10 items-start"
    >
      {/* Execution Panel (Sidebar) - Now on the left */}
      <div className="lg:col-span-4 space-y-8 order-2 lg:order-1">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-[3rem] p-10 shadow-2xl sticky top-24 overflow-hidden"
        >
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-[var(--accent-primary)]/5 blur-[60px] rounded-full" />
          
          <div className="relative z-10">
            <div className="flex items-center gap-4 mb-12">
              <div className="w-12 h-12 rounded-2xl bg-[var(--accent-primary)]/10 flex items-center justify-center">
                <Settings2 size={24} className="text-[var(--accent-primary)]" />
              </div>
              <div>
                <h3 className="text-xl font-black tracking-tight">Execution</h3>
                <p className="text-[10px] font-black text-[var(--text-tertiary)] uppercase tracking-widest mt-1">Runtime settings</p>
              </div>
            </div>
            
            <div className="space-y-8">
              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-tertiary)] ml-1">
                  Rows to Generate
                </label>
                <div className="relative group">
                  <input
                    type="number"
                    value={numRows}
                    onChange={(e) => setNumRows(Math.max(1, Math.min(100000, parseInt(e.target.value) || 1)))}
                    min={1}
                    max={100000}
                    className="w-full h-14 bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-2xl pl-14 pr-6 text-sm font-black font-mono focus:border-[var(--accent-primary)] focus:outline-none transition-all shadow-inner"
                  />
                  <div className="absolute left-5 top-1/2 -translate-y-1/2 text-[var(--accent-primary)] opacity-40 group-focus-within:opacity-100 transition-opacity">
                    <Layers size={20} />
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-[var(--bg-tertiary)]/50 border border-[var(--border-default)] flex gap-4">
                <Info size={18} className="text-[var(--accent-secondary)] shrink-0" />
                <p className="text-[11px] font-medium leading-relaxed text-[var(--text-secondary)] opacity-80">
                  Mimesis mode generates data based on statistical distributions. Large row counts (up to 100k) are processed asynchronously for stability.
                </p>
              </div>
            </div>

            <div className="mt-12">
              <AnimatedButton
                onClick={handleSubmit}
                disabled={Object.keys(schema).length === 0 || isGenerating}
                loading={isGenerating}
                icon={Wand2}
                size="lg"
                className="w-full"
              >
                Launch Engine
              </AnimatedButton>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Schema Builder (Main Column) - Now on the right */}
      <div className="lg:col-span-8 space-y-6 order-1 lg:order-2">
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-[3rem] p-8 md:p-12 shadow-2xl relative">
          <div className="absolute inset-0 rounded-[3rem] overflow-hidden pointer-events-none">
            <div className="absolute top-0 right-0 p-12 opacity-[0.02]">
               <Layers size={200} />
            </div>
          </div>

          <div className="relative z-10">
            <div className="flex items-center justify-between mb-12">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-[var(--accent-secondary)]/10 flex items-center justify-center border border-[var(--accent-secondary)]/20 shadow-inner">
                  <Wand2 size={28} className="text-[var(--accent-secondary)]" />
                </div>
                <div>
                  <h3 className="text-2xl font-black tracking-tight leading-tight">Logical Schema</h3>
                  <p className="text-[10px] font-black text-[var(--text-tertiary)] uppercase tracking-[0.2em] mt-1.5 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-secondary)] animate-pulse" />
                    {Object.keys(schema).length} ACTIVE DATA LOGICS
                  </p>
                </div>
              </div>
            </div>

            <SchemaBuilder schema={schema} onChange={setSchema} />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
