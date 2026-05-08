import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileSpreadsheet, X, Zap, Settings } from 'lucide-react';
import AnimatedButton from '../ui/AnimatedButton';
import { formatFileSize } from '../../utils/formatters';

export default function CTGANForm({ onSubmit, isGenerating }) {
  const [file, setFile] = useState(null);
  const [numRows, setNumRows] = useState(1000);
  const [epochs, setEpochs] = useState(100);

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
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  const handleSubmit = () => {
    if (!file) return;
    onSubmit(file, numRows, epochs);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full max-w-2xl mx-auto space-y-8"
    >
      {/* Upload Zone */}
      <div
        {...getRootProps()}
        className={`dropzone-border p-10 text-center cursor-pointer transition-all ${
          isDragActive ? 'active' : ''
        }`}
      >
        <input {...getInputProps()} />
        <AnimatePresence mode="wait">
          {file ? (
            <motion.div
              key="file-info"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center gap-4"
            >
              <motion.div
                initial={{ rotate: -10 }}
                animate={{ rotate: 0 }}
                className="w-14 h-14 rounded-xl bg-[var(--accent-success)]/15 flex items-center justify-center"
              >
                <FileSpreadsheet size={28} className="text-[var(--accent-success)]" />
              </motion.div>
              <div className="text-left">
                <p className="font-semibold text-[var(--text-primary)]">{file.name}</p>
                <p className="text-sm text-[var(--text-secondary)]">
                  {formatFileSize(file.size)}
                </p>
              </div>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={(e) => { e.stopPropagation(); setFile(null); }}
                className="ml-4 p-2 rounded-lg bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--accent-error)] transition-colors"
              >
                <X size={18} />
              </motion.button>
            </motion.div>
          ) : (
            <motion.div
              key="upload-prompt"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                animate={isDragActive ? { scale: 1.1, y: -5 } : { scale: 1, y: 0 }}
                className="w-16 h-16 rounded-2xl bg-[var(--accent-primary)]/10 flex items-center justify-center mx-auto mb-4"
              >
                <Upload
                  size={30}
                  className="text-[var(--accent-primary)]"
                />
              </motion.div>
              <p className="text-[var(--text-primary)] font-medium mb-1">
                {isDragActive ? 'Drop your file here' : 'Drag & drop your dataset'}
              </p>
              <p className="text-sm text-[var(--text-secondary)]">
                CSV or XLSX • Max 10MB
              </p>
            </motion.div>
          )}
        </AnimatePresence>
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
          <h3 className="font-semibold">Generation Parameters</h3>
        </div>

        <div className="grid sm:grid-cols-2 gap-6">
          <div>
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
            <p className="text-xs text-[var(--text-tertiary)] mt-1">1 – 50,000 rows</p>
          </div>

          <div>
            <label className="block text-sm text-[var(--text-secondary)] mb-2">
              Training Epochs
            </label>
            <input
              type="number"
              value={epochs}
              onChange={(e) => setEpochs(Math.max(1, Math.min(1000, parseInt(e.target.value) || 1)))}
              min={1}
              max={1000}
              className="w-full px-4 py-3 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-default)] text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:outline-none transition-colors font-mono"
            />
            <p className="text-xs text-[var(--text-tertiary)] mt-1">More = higher quality, slower</p>
          </div>
        </div>
      </motion.div>

      {/* Submit */}
      <div className="flex justify-center">
        <AnimatedButton
          onClick={handleSubmit}
          disabled={!file || isGenerating}
          loading={isGenerating}
          icon={Zap}
          size="lg"
          className="min-w-[220px]"
        >
          Generate Data
        </AnimatedButton>
      </div>
    </motion.div>
  );
}
