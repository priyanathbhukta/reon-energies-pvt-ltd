// frontend/src/hooks/useQuotations.js
import { useState, useCallback } from 'react';
import { quotationAPI } from '../api/quotations';

export function useQuotations() {
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);
  const [list,     setList]     = useState([]);
  const [meta,     setMeta]     = useState({ total:0, page:1, limit:20 });

  const clearError = () => setError(null);

  const fetchList = useCallback(async (params = {}) => {
    setLoading(true); setError(null);
    try {
      const res = await quotationAPI.list(params);
      setList(res.data);
      setMeta({ total: res.total, page: res.page, limit: res.limit });
    } catch (e) { setError(e.message); }
    finally     { setLoading(false); }
  }, []);

  const createQuotation = useCallback(async (data) => {
    setLoading(true); setError(null);
    try {
      const res = await quotationAPI.create(data);
      return res.data;
    } catch (e) { setError(e.message); throw e; }
    finally     { setLoading(false); }
  }, []);

  const updateQuotation = useCallback(async (id, data) => {
    setLoading(true); setError(null);
    try {
      const res = await quotationAPI.update(id, data);
      return res.data;
    } catch (e) { setError(e.message); throw e; }
    finally     { setLoading(false); }
  }, []);

  const deleteQuotation = useCallback(async (id) => {
    setLoading(true); setError(null);
    try { await quotationAPI.delete(id); }
    catch (e) { setError(e.message); throw e; }
    finally   { setLoading(false); }
  }, []);

  const regeneratePDF = useCallback(async (id) => {
    setLoading(true); setError(null);
    try {
      const res = await quotationAPI.regenerate(id);
      return res.data;
    } catch (e) { setError(e.message); throw e; }
    finally     { setLoading(false); }
  }, []);

  return {
    loading, error, list, meta,
    clearError, fetchList,
    createQuotation, updateQuotation,
    deleteQuotation, regeneratePDF,
  };
}
