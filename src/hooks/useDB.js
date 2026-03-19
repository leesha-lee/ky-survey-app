import { useState, useEffect, useCallback } from 'react';
import { openDB, loadData, idbGetAllKeys } from '../lib/db';
import { extractBlobs } from '../lib/blob';
import { idbPut, saveData } from '../lib/db';
import { seedSampleData } from '../lib/seed';

// Migrate from localStorage if exists
async function migrateFromLocalStorage() {
  const raw = localStorage.getItem('survey_app_data');
  if (!raw) return;
  try {
    const old = JSON.parse(raw);
    for (const s of old.surveys) {
      const { cleaned, blobs } = extractBlobs(s.questions);
      s.questions = cleaned;
      for (const [key, val] of Object.entries(blobs)) {
        await idbPut('blobs', key, val);
      }
    }
    await saveData(old);
    localStorage.removeItem('survey_app_data');
    console.log('Migrated from localStorage to IndexedDB');
  } catch (e) {
    console.error('Migration failed', e);
  }
}

export function useDB() {
  const [data, setData] = useState({ surveys: [], responses: {} });
  const [saving, setSaving] = useState(false);
  const [blobCount, setBlobCount] = useState(0);

  const refresh = useCallback(async () => {
    const d = await loadData();
    setData(d);
    try {
      const keys = await idbGetAllKeys('blobs');
      setBlobCount(keys.length);
    } catch (e) { /* ignore */ }
  }, []);

  useEffect(() => {
    let mounted = true;
    async function init() {
      await openDB();
      await migrateFromLocalStorage();
      await seedSampleData();
      if (mounted) await refresh();
    }
    init();
    return () => { mounted = false; };
  }, [refresh]);

  return { data, refresh, saving, setSaving, blobCount };
}
