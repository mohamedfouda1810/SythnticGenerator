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
    mode, step, status, result, error, isGenerating, params,
    selectMode, submitCTGAN, submitMimesis, handleDownload,
    reset, goBack,
  } = useGeneration();

  const isComplete = status === 'complete' && result;
  const isActive = isGenerating && !isComplete;

  return (
    <div className="page-content pt-24 pb-20 px-6">
      <div className="max-w-7xl mx-auto">
        {/* Step Indicator */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-center gap-4 md:gap-8 mb-16"
        >
          {steps.map((s, i) => {
            const isStepActive = step >= s.num;
            const isStepCurrent = step === s.num;

            return (
              <div key={s.num} className="flex items-center gap-3 md:gap-4">
                <motion.div
                  animate={{
                    backgroundColor: isStepActive
                      ? 'var(--accent-primary)'
                      : 'var(--bg-tertiary)',
                    scale: isStepCurrent ? 1.2 : 1,
                    boxShadow: isStepCurrent ? '0 0 20px rgba(108, 99, 255, 0.4)' : 'none',
                  }}
                  className="w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center text-sm md:text-base font-bold transition-all duration-300"
                >
                  {step > s.num ? (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                      <Check size={20} className="text-white" />
                    </motion.div>
                  ) : (
                    <span className={isStepActive ? 'text-white' : 'text-[var(--text-tertiary)]'}>{s.num}</span>
                  )}
                </motion.div>
                <div className="hidden sm:flex flex-col">
                  <span className={`text-[10px] uppercase tracking-widest font-bold ${
                    isStepActive ? 'text-[var(--accent-primary)]' : 'text-[var(--text-tertiary)]'
                  }`}>
                    Step {s.num}
                  </span>
                  <span className={`text-sm font-semibold ${
                    isStepActive ? 'text-[var(--text-primary)]' : 'text-[var(--text-tertiary)]'
                  }`}>
                    {s.label}
                  </span>
                </div>
                {i < steps.length - 1 && (
                  <motion.div
                    className="w-8 md:w-16 h-0.5 rounded-full"
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
            <GeneratingAnimation 
              status={status} 
              mode={mode} 
              numRows={params.numRows} 
              epochs={params.epochs} 
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
