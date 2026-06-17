import { useState, useCallback, useEffect } from 'react';
import { getHistory, deleteJob as apiDeleteJob } from '../services/api';
import toast from 'react-hot-toast';

export function useHistory() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState('all');

  const fetchHistory = useCallback(async (p = 1) => {
    setLoading(true);
    const { data, error } = await getHistory(p, 20);
    if (error) {
      toast.error(`Failed to load history: ${error}`);
      setLoading(false);
      return;
    }
    setJobs(data.jobs || []);
    setTotalPages(data.pages || 1);
    setTotal(data.total || 0);
    setPage(data.page || 1);
    setLoading(false);
  }, []);

  const deleteJob = useCallback(async (jobId) => {
    const { error } = await apiDeleteJob(jobId);
    if (error) {
      toast.error(`Delete failed: ${error}`);
      return;
    }
    toast.success('Job deleted');
    fetchHistory(page);
  }, [fetchHistory, page]);

  const goToPage = useCallback((p) => {
    setPage(p);
    fetchHistory(p);
  }, [fetchHistory]);

  const refresh = useCallback(() => {
    fetchHistory(page);
  }, [fetchHistory, page]);

  useEffect(() => {
    queueMicrotask(() => fetchHistory(1));
  }, [fetchHistory]);

  const filteredJobs = filter === 'all'
    ? jobs
    : jobs.filter(j =>
        filter === 'ctgan' ? j.mode === 'ctgan' :
        filter === 'mimesis' ? j.mode === 'mimesis' :
        filter === 'completed' ? j.status === 'completed' :
        filter === 'failed' ? j.status === 'failed' :
        true
      );

  return {
    jobs: filteredJobs,
    allJobs: jobs,
    loading, page, totalPages, total,
    filter, setFilter,
    fetchHistory, deleteJob, goToPage, refresh,
  };
}
