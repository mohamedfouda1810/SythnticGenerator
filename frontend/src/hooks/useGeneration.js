import { useState, useCallback, useRef, useEffect } from 'react';
import { generateCTGAN, generateMimesis, downloadResult, getJobDetails } from '../services/api';
import toast from 'react-hot-toast';

export function useGeneration() {
  const [mode, setMode] = useState(null);        // 'ctgan' | 'mimesis'
  const [step, setStep] = useState(1);            // 1=mode, 2=configure, 3=generating/result
  const [status, setStatus] = useState('idle');   // idle|uploading|analyzing|training|generating|evaluating|complete|error
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [params, setParams] = useState({ numRows: 1000, epochs: 50 });
  const timerRef = useRef(null);

  const pollJobStatus = useCallback(async (jobId) => {
    const poll = async () => {
      const { data, error: pollError } = await getJobDetails(jobId);
      
      if (pollError) {
        setStatus('error');
        setError(pollError);
        setIsGenerating(false);
        localStorage.removeItem('synthgen_active_job');
        toast.error(`Monitoring failed: ${pollError}`);
        return;
      }

      if (data.status === 'completed') {
        setStatus('complete');
        const mappedResult = {
          ...data,
          synthetic_data: data.synthetic_data_sample || [],
          columns: data.columns_generated || [],
        };
        setResult(mappedResult);
        setIsGenerating(false);
        
        // Update persistence with completed status
        const saved = JSON.parse(localStorage.getItem('synthgen_active_job') || '{}');
        localStorage.setItem('synthgen_active_job', JSON.stringify({ ...saved, status: 'completed' }));
        
        toast.success('Synthetic data generated successfully!');
      } else if (data.status === 'failed') {
        setStatus('error');
        setError(data.error_message || 'Generation failed');
        setIsGenerating(false);
        localStorage.removeItem('synthgen_active_job');
        toast.error(`Generation failed: ${data.error_message}`);
      } else {
        // Continue polling every 2 seconds
        timerRef.current = setTimeout(poll, 2000);
      }
    };

    poll();
  }, []);

  // Persistence: Check for active/completed job on mount
  useEffect(() => {
    let cancelled = false;

    queueMicrotask(() => {
      if (cancelled) return;
      const activeJob = localStorage.getItem('synthgen_active_job');
      if (!activeJob) return;

      try {
        const { jobId, mode: jobMode, numRows, epochs, removePII, status: savedStatus } =
          JSON.parse(activeJob);
        setMode(jobMode);
        setStep(3);
        setParams({ numRows, epochs, removePII });

        if (savedStatus === 'completed') {
          setIsGenerating(true);
          setStatus('completing');
          getJobDetails(jobId).then(({ data, error }) => {
            if (cancelled) return;
            if (!error && data.status === 'completed') {
              const mappedResult = {
                ...data,
                synthetic_data: data.synthetic_data_sample || [],
                columns: data.columns_generated || [],
              };
              setResult(mappedResult);
              setStatus('complete');
              setIsGenerating(false);
            } else {
              localStorage.removeItem('synthgen_active_job');
              setStatus('error');
              setIsGenerating(false);
            }
          });
        } else {
          setIsGenerating(true);
          setStatus(jobMode === 'ctgan' ? 'training' : 'generating');
          pollJobStatus(jobId);
        }
      } catch {
        localStorage.removeItem('synthgen_active_job');
      }
    });

    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [pollJobStatus]);

  const selectMode = useCallback((m) => {
    setMode(m);
    setStep(2);
    setResult(null);
    setError(null);
    setStatus('idle');
  }, []);

  const submitCTGAN = useCallback(async (file, numRows, epochs, removePII = true) => {
    setStep(3);
    setIsGenerating(true);
    setError(null);
    setResult(null);
    setParams({ numRows, epochs, removePII });

    // Initial status
    setStatus('uploading');

    const { data, error: apiError } = await generateCTGAN(file, numRows, epochs, removePII);

    if (apiError) {
      if (timerRef.current) clearTimeout(timerRef.current);
      setStatus('error');
      setError(apiError);
      setIsGenerating(false);
      toast.error(`Upload failed: ${apiError}`);
      return;
    }

    // If backend returned "processing", start polling
    if (data.status === 'processing') {
      setStatus('training'); // Jump to training
      // Save for persistence
      localStorage.setItem('synthgen_active_job', JSON.stringify({
        jobId: data.job_id,
        mode: 'ctgan',
        numRows,
        epochs,
        removePII
      }));
      pollJobStatus(data.job_id);
    } else {
      // Immediate completion (shouldn't happen now but for safety)
      setStatus('complete');
      setResult(data);
      setIsGenerating(false);
      toast.success('Synthetic data generated successfully!');
    }
  }, [pollJobStatus]);

  const submitMimesis = useCallback(async (schema, numRows) => {
    setStep(3);
    setIsGenerating(true);
    setError(null);
    setResult(null);
    setParams({ numRows, epochs: 0 });

    setStatus('uploading');

    const { data, error: apiError } = await generateMimesis(schema, numRows);

    if (apiError) {
      setStatus('error');
      setError(apiError);
      setIsGenerating(false);
      toast.error(`Generation failed: ${apiError}`);
      return;
    }

    if (data.status === 'processing') {
      setStatus('generating');
      localStorage.setItem('synthgen_active_job', JSON.stringify({
        jobId: data.job_id,
        mode: 'mimesis',
        numRows,
        epochs: 0
      }));
      pollJobStatus(data.job_id);
    } else {
      setStatus('complete');
      setResult(data);
      setIsGenerating(false);
      toast.success('Synthetic data generated successfully!');
    }
  }, [pollJobStatus]);

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
    localStorage.removeItem('synthgen_active_job');
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
    mode, step, status, result, error, isGenerating, params,
    selectMode, submitCTGAN, submitMimesis, handleDownload,
    reset, goBack,
  };
}
