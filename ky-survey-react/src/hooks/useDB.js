import { useState, useEffect, useCallback } from 'react';
import { loadData } from '../lib/db';
import { seedSampleData } from '../lib/seed';

export function useDB() {
  const [data, setData] = useState({ surveys: [], responses: {} });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    try {
      const d = await loadData();
      setData(d);
      setError(null);
    } catch (e) {
      console.error('Firestore loadData failed:', e);
      setError(e);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    async function init() {
      try {
        await seedSampleData();
      } catch (e) {
        console.warn('init warning:', e);
      }
      if (mounted) await refresh();
    }
    init();
    return () => { mounted = false; };
  }, [refresh]);

  return { data, refresh, saving, setSaving, error };
}
