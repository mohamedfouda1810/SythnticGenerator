import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Check } from 'lucide-react';
import { useGeneration } from '../hooks/useGeneration';
import ModeSelector from '../components/generation/ModeSelector';
import CTGANForm from '../components/generation/CTGANForm';
import MimesisForm from '../components/generation/MimesisForm';
import GeneratingAnimation from '../components/generation/GeneratingAnimation';
import ResultPanel from '../components/generation/ResultPanel';
import AnimatedButton from '../components/ui/AnimatedButton';

const steps = [
  { num: 1, label: 'Choose Mode' },
  { num: 2, label: 'Configure' },
  { num: 3, label: 'Generate' },
];

export default function GeneratePage() {
  const {
    mode, step, status, result, error, isGenerating,
    selectMode, submitCTGAN, submitMimesis, handleDownload,
    reset, goBack,
  } = useGeneration();

  const isComplete = status === 'complete' && result;
  const isActive = isGenerating && !isComplete;

  return (
    <div className="min-h-screen pt-24 pb-20 px-6">
      <div className="max-w-5xl mx-auto">
        {/* Step Indicator */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-center gap-2 mb-12"
        >
          {steps.map((s, i) => {
            const isStepActive = step >= s.num;
            const isStepCurrent = step === s.num;

            return (
              <div key={s.num} className="flex items-center gap-2">
                <motion.div
                  animate={{
                    backgroundColor: isStepActive
                      ? 'var(--accent-primary)'
                      : 'var(--bg-tertiary)',
                    scale: isStepCurrent ? 1.1 : 1,
                  }}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold"
                >
                  {step > s.num ? (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                      <Check size={16} />
                    </motion.div>
                  ) : (
                    s.num
                  )}
                </motion.div>
                <span className={`text-sm hidden sm:block ${
                  isStepActive ? 'text-[var(--text-primary)]' : 'text-[var(--text-tertiary)]'
                }`}>
                  {s.label}
                </span>
                {i < steps.length - 1 && (
                  <motion.div
                    className="w-12 h-0.5 rounded"
                    animate={{
                      backgroundColor: step > s.num
                        ? 'var(--accent-primary)'
                        : 'var(--bg-tertiary)',
                    }}
                  />
                )}
              </div>
            );
          })}
        </motion.div>

        {/* Back Button */}
        {step > 1 && !isActive && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="mb-6"
          >
            <AnimatedButton onClick={goBack} variant="ghost" size="sm" icon={ArrowLeft}>
              Back
            </AnimatedButton>
          </motion.div>
        )}

        {/* Step Content */}
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="mode"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
            >
              <ModeSelector onSelect={selectMode} selectedMode={mode} />
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="configure"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
            >
              {mode === 'ctgan' && (
                <CTGANForm onSubmit={submitCTGAN} isGenerating={isGenerating} />
              )}
              {mode === 'mimesis' && (
                <MimesisForm onSubmit={submitMimesis} isGenerating={isGenerating} />
              )}
            </motion.div>
          )}

          {step === 3 && isComplete && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <ResultPanel
                result={result}
                onDownload={handleDownload}
                onReset={reset}
              />
            </motion.div>
          )}

          {step === 3 && error && !isGenerating && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-16"
            >
              <div className="w-16 h-16 rounded-2xl bg-[var(--accent-error)]/15 flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">⚠</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Generation Failed</h3>
              <p className="text-[var(--text-secondary)] mb-6 max-w-md mx-auto">{error}</p>
              <AnimatedButton onClick={reset} variant="secondary">
                Try Again
              </AnimatedButton>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Generating Overlay */}
        <AnimatePresence>
          {isActive && (
            <GeneratingAnimation status={status} mode={mode} />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
