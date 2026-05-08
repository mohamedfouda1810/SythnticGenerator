import { useState } from 'react';
import { motion } from 'framer-motion';
import { Wand2, Settings } from 'lucide-react';
import AnimatedButton from '../ui/AnimatedButton';
import SchemaBuilder from './SchemaBuilder';

const defaultSchema = {
  patient_name: { type: 'name', options: {} },
  age: { type: 'age', options: { min: 18, max: 90 } },
  diagnosis: { type: 'diagnosis', options: {} },
  blood_type: { type: 'blood_type', options: {} },
};

export default function MimesisForm({ onSubmit, isGenerating }) {
  const [schema, setSchema] = useState(defaultSchema);
  const [numRows, setNumRows] = useState(1000);

  const handleSubmit = () => {
    if (Object.keys(schema).length === 0) return;
    onSubmit(schema, numRows);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full max-w-3xl mx-auto space-y-8"
    >
      {/* Schema Builder */}
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-5">
          <Wand2 size={18} className="text-[var(--accent-secondary)]" />
          <h3 className="font-semibold">Schema Builder</h3>
          <span className="text-xs text-[var(--text-tertiary)] ml-auto">
            {Object.keys(schema).length} fields
          </span>
        </div>
        <SchemaBuilder schema={schema} onChange={setSchema} />
      </div>

      {/* Parameters */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-2xl p-6"
      >
        <div className="flex items-center gap-2 mb-5">
          <Settings size={18} className="text-[var(--accent-primary)]" />
          <h3 className="font-semibold">Parameters</h3>
        </div>
        <div className="max-w-xs">
          <label className="block text-sm text-[var(--text-secondary)] mb-2">
            Number of Rows
          </label>
          <input
            type="number"
            value={numRows}
            onChange={(e) => setNumRows(Math.max(1, Math.min(50000, parseInt(e.target.value) || 1)))}
            min={1}
            max={50000}
            className="w-full px-4 py-3 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-default)] text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:outline-none transition-colors font-mono"
          />
        </div>
      </motion.div>

      {/* Submit */}
      <div className="flex justify-center">
        <AnimatedButton
          onClick={handleSubmit}
          disabled={Object.keys(schema).length === 0 || isGenerating}
          loading={isGenerating}
          icon={Wand2}
          size="lg"
          className="min-w-[220px]"
        >
          Generate Data
        </AnimatedButton>
      </div>
    </motion.div>
  );
}
