import { idbGet, idbPut } from './db';

let cachedDepartments = null;

export async function fetchADDepartments(_unused1, _unused2, forceRefresh) {
  if (cachedDepartments && !forceRefresh) return cachedDepartments;

  if (!forceRefresh) {
    try {
      const cached = await idbGet('meta', 'ad_departments');
      if (cached && cached.ts && Date.now() - cached.ts < 24 * 60 * 60 * 1000) {
        cachedDepartments = cached.data;
        return cachedDepartments;
      }
    } catch { /* ignore */ }
  }

  try {
    const resp = await fetch('/api/survey/departments', { credentials: 'include' });
    if (!resp.ok) return cachedDepartments || [];
    const data = await resp.json();
    cachedDepartments = data.departments || [];
    try { await idbPut('meta', 'ad_departments', { data: cachedDepartments, ts: Date.now() }); } catch { /* ignore */ }
    return cachedDepartments;
  } catch {
    return cachedDepartments || [];
  }
}

export function getMainDepartments(depts, minCount) {
  if (!depts) return [];
  return depts.filter(d => d.count >= (minCount || 5));
}
