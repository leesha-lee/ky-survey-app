import { uid } from './utils';
import { idbGet, idbPut, idbDelete } from './db';

const MAX_BLOB_BYTES = 900 * 1024;

export function compressImage(dataUrl) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const MAX = 1920;
      let w = img.width, h = img.height;
      if (w > MAX || h > MAX) {
        if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
        else { w = Math.round(w * MAX / h); h = MAX; }
      }
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);

      const qualities = [0.92, 0.8, 0.6, 0.4, 0.3];
      for (const q of qualities) {
        const result = canvas.toDataURL('image/jpeg', q);
        if (result.length <= MAX_BLOB_BYTES) { resolve(result); return; }
      }
      const scale = 0.5;
      canvas.width = Math.round(w * scale);
      canvas.height = Math.round(h * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.6));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

function getBlobKey(url) {
  if (url.startsWith('idb://')) return url.slice(6);
  if (url.startsWith('fs://')) return url.slice(5);
  return null;
}

function isBlobRef(url) {
  return url && (url.startsWith('idb://') || url.startsWith('fs://'));
}

export async function extractBlobs(questions) {
  const blobs = {};
  const cleaned = JSON.parse(JSON.stringify(questions));
  for (const q of cleaned) {
    if (!q.media) continue;
    for (const m of q.media) {
      if (m.url && m.url.startsWith('data:') && m.url.length > 200) {
        const key = 'blob_' + uid();
        if (m.type === 'image') {
          blobs[key] = await compressImage(m.url);
        } else {
          blobs[key] = m.url;
        }
        m.url = 'idb://' + key;
      }
    }
  }
  return { cleaned, blobs };
}

export async function restoreBlobs(questions) {
  const restored = JSON.parse(JSON.stringify(questions));
  for (const q of restored) {
    if (!q.media) continue;
    for (const m of q.media) {
      if (isBlobRef(m.url)) {
        const key = getBlobKey(m.url);
        const dataUrl = await idbGet('blobs', key);
        m.url = dataUrl || '';
      }
    }
  }
  return restored;
}

export async function saveSurveyData(data, surveyQuestions) {
  const { cleaned, blobs } = await extractBlobs(surveyQuestions);
  for (const [key, val] of Object.entries(blobs)) {
    await idbPut('blobs', key, val);
  }
  return cleaned;
}

export async function deleteSurveyBlobs(questions) {
  if (!questions) return;
  for (const q of questions) {
    if (!q.media) continue;
    for (const m of q.media) {
      if (isBlobRef(m.url)) {
        await idbDelete('blobs', getBlobKey(m.url));
      }
    }
  }
}

export function extractDescBlobs(images) {
  const blobs = {};
  const cleaned = JSON.parse(JSON.stringify(images || []));
  cleaned.forEach(img => {
    if (img.url && img.url.startsWith('data:') && img.url.length > 200) {
      const key = 'blob_' + uid();
      blobs[key] = img.url;
      img.url = 'idb://' + key;
    }
  });
  return { cleaned, blobs };
}

export async function restoreDescBlobs(images) {
  const restored = JSON.parse(JSON.stringify(images || []));
  for (const img of restored) {
    if (isBlobRef(img.url)) {
      const key = getBlobKey(img.url);
      const dataUrl = await idbGet('blobs', key);
      img.url = dataUrl || '';
    }
  }
  return restored;
}

export async function deleteDescBlobs(images) {
  if (!images) return;
  for (const img of images) {
    if (isBlobRef(img.url)) {
      await idbDelete('blobs', getBlobKey(img.url));
    }
  }
}
