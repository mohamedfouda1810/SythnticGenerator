import { useState, useCallback, useRef } from 'react';
import { generateCTGAN, generateMimesis, downloadResult } from '../services/api';
import toast from 'react-hot-toast';

const STATUS_SEQUENCE_CTGAN = ['uploading', 'analyzing', 'training', 'generating', 'evaluating', 'complete'];
const STATUS_SEQUENCE_MIMESIS = ['uploading', 'generating', 'complete'];

export function useGeneration() {
  const [mode, setMode] = useState(null);        // 'ctgan' | 'mimesis'
  const [step, setStep] = useState(1);            // 1=mode, 2=configure, 3=generating/result
  const [status, setStatus] = useState('idle');   // idle|uploading|analyzing|training|generating|evaluating|complete|error
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const timerRef = useRef(null);

  const selectMode = useCallback((m) => {
    setMode(m);
    setStep(2);
    setResult(null);
    setError(null);
    setStatus('idle');
  }, []);

  const simulateStatusProgression = useCallback((sequence) => {
    let i = 0;
    const delays = {
      uploading: 800,
      analyzing: 1500,
      training: 2000,
      generating: 1500,
      evaluating: 1200,
    };

    function advance() {
      if (i < sequence.length - 1) {
        setStatus(sequence[i]);
        const delay = delays[sequence[i]] || 1000;
        timerRef.current = setTimeout(() => {
          i++;
          advance();
        }, delay);
      }
    }
    advance();
  }, []);

  const submitCTGAN = useCallback(async (file, numRows, epochs) => {
    setStep(3);
    setIsGenerating(true);
    setError(null);
    setResult(null);

    simulateStatusProgression(STATUS_SEQUENCE_CTGAN);

    const { data, error: apiError } = await generateCTGAN(file, numRows, epochs);

    if (timerRef.current) clearTimeout(timerRef.current);

    if (apiError) {
      setStatus('error');
      setError(apiError);
      setIsGenerating(false);
      toast.error(`Generation failed: ${apiError}`);
      return;
    }

    setStatus('complete');
    setResult(data);
    setIsGenerating(false);
    toast.success('Synthetic data generated successfully!');
  }, [simulateStatusProgression]);

  const submitMimesis = useCallback(async (schema, numRows) => {
    setStep(3);
    setIsGenerating(true);
    setError(null);
    setResult(null);

    simulateStatusProgression(STATUS_SEQUENCE_MIMESIS);

    const { data, error: apiError } = await generateMimesis(schema, numRows);

    if (timerRef.current) clearTimeout(timerRef.current);

    if (apiError) {
      setStatus('error');
      setError(apiError);
      setIsGenerating(false);
      toast.error(`Generation failed: ${apiError}`);
      return;
    }

    setStatus('complete');
    setResult(data);
    setIsGenerating(false);
    toast.success('Synthetic data generated successfully!');
  }, [simulateStatusProgression]);

  const handleDownload = useCallback(async () => {
    if (!result?.download_token) return;
    const { error: dlError } = await downloadResult(result.download_token);
    if (dlError) {
      toast.error(`Download failed: ${dlError}`);
    } else {
      toast.success('Download started!');
    }
  }, [result]);

  const reset = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setMode(null);
    setStep(1);
    setStatus('idle');
    setResult(null);
    setError(null);
    setIsGenerating(false);
  }, []);

  const goBack = useCallback(() => {
    if (step === 2) {
      setMode(null);
      setStep(1);
    } else if (step === 3 && !isGenerating) {
      setStep(2);
      setStatus('idle');
      setResult(null);
      setError(null);
    }
  }, [step, isGenerating]);

  return {
    mode, step, status, result, error, isGenerating,
    selectMode, submitCTGAN, submitMimesis, handleDownload,
    reset, goBack,
  };
}
