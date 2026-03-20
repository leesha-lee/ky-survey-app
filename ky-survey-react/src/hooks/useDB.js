import { useState, useEffect, useCallback } from 'react';
import { loadData, saveData, idbPut } from '../lib/db';
import { seedSampleData } from '../lib/seed';

// One-time migration: IndexedDB → Firestore
async function migrateFromIndexedDB() {
  if (localStorage.getItem('idb_migrated_to_firestore')) return;

  try {
    // Check if IndexedDB 'SurveyAppDB' exists
    const dbs = await indexedDB.databases?.();
    const hasDB = dbs ? dbs.some(d => d.name === 'SurveyAppDB') : true;
    if (!hasDB) {
      localStorage.setItem('idb_migrated_to_firestore', '1');
      return;
    }

    const db = await new Promise((resolve, reject) => {
      const req = indexedDB.open('SurveyAppDB', 1);
      req.onupgradeneeded = (e) => {
        // DB didn't exist, close and skip
        e.target.transaction.abort();
        reject(new Error('no-db'));
      };
      req.onsuccess = (e) => resolve(e.target.result);
      req.onerror = (e) => reject(e.target.error);
    });

    // Read appdata from 'meta' store
    const appdata = await new Promise((resolve, reject) => {
      const tx = db.transaction('meta', 'readonly');
      const req = tx.objectStore('meta').get('appdata');
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

    if (appdata && appdata.surveys && appdata.surveys.length > 0) {
      // Check if Firestore already has data
      const existing = await loadData();
      if (existing.surveys.length === 0) {
        // Migrate appdata
        await saveData(appdata);
        console.log('Migrated appdata to Firestore:', appdata.surveys.length, 'surveys');
      }
    }

    // Migrate blobs
    if (db.objectStoreNames.contains('blobs')) {
      const allKeys = await new Promise((resolve, reject) => {
        const tx = db.transaction('blobs', 'readonly');
        const req = tx.objectStore('blobs').getAllKeys();
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });

      for (const key of allKeys) {
        const value = await new Promise((resolve, reject) => {
          const tx = db.transaction('blobs', 'readonly');
          const req = tx.objectStore('blobs').get(key);
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => reject(req.error);
        });
        if (value) {
          await idbPut('blobs', key, value);
        }
      }
      if (allKeys.length > 0) {
        console.log('Migrated', allKeys.length, 'blobs to Firestore');
      }
    }

    db.close();
    localStorage.setItem('idb_migrated_to_firestore', '1');
    console.log('IndexedDB → Firestore migration complete');
  } catch (e) {
    if (e.message === 'no-db') {
      localStorage.setItem('idb_migrated_to_firestore', '1');
      return;
    }
    console.error('IndexedDB migration failed:', e);
  }
}

export function useDB() {
  const [data, setData] = useState({ surveys: [], responses: {} });
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    const d = await loadData();
    setData(d);
  }, []);

  useEffect(() => {
    let mounted = true;
    async function init() {
      await migrateFromIndexedDB();
      await seedSampleData();
      if (mounted) await refresh();
    }
    init();
    return () => { mounted = false; };
  }, [refresh]);

  return { data, refresh, saving, setSaving };
}
