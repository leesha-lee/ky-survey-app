import { idbGet, idbPut } from './db';

let cachedDepartments = null;

export async function fetchADDepartments(msalInstance, loginRequest, forceRefresh) {
  if (cachedDepartments && !forceRefresh) return cachedDepartments;

  // Try cache from IndexedDB first
  if (!forceRefresh) {
    try {
      const cached = await idbGet('meta', 'ad_departments');
      if (cached && cached.ts && Date.now() - cached.ts < 24 * 60 * 60 * 1000) {
        cachedDepartments = cached.data;
        return cachedDepartments;
      }
    } catch (e) { /* ignore */ }
  }

  // Need access token
  let accessToken = null;
  if (msalInstance) {
    const accounts = msalInstance.getAllAccounts();
    if (accounts.length > 0) {
      try {
        const tokenResp = await msalInstance.acquireTokenSilent({ ...loginRequest, account: accounts[0] });
        accessToken = tokenResp.accessToken;
      } catch (e) { console.warn('Token acquire failed', e); }
    }
  }
  if (!accessToken) return cachedDepartments || [];

  try {
    let allUsers = [];
    let url = 'https://graph.microsoft.com/v1.0/users?$select=department&$top=999';
    while (url) {
      const resp = await fetch(url, { headers: { 'Authorization': 'Bearer ' + accessToken } });
      if (!resp.ok) break;
      const data = await resp.json();
      allUsers = allUsers.concat(data.value || []);
      url = data['@odata.nextLink'] || null;
    }
    const counts = {};
    allUsers.forEach(u => {
      if (u.department && u.department.trim()) {
        counts[u.department.trim()] = (counts[u.department.trim()] || 0) + 1;
      }
    });
    cachedDepartments = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));

    // Cache to IndexedDB (24h TTL)
    try { await idbPut('meta', 'ad_departments', { data: cachedDepartments, ts: Date.now() }); } catch (e) { /* ignore */ }
    return cachedDepartments;
  } catch (e) {
    console.error('Failed to fetch departments', e);
    return cachedDepartments || [];
  }
}

export function getMainDepartments(depts, minCount) {
  if (!depts) return [];
  return depts.filter(d => d.count >= (minCount || 5));
}
