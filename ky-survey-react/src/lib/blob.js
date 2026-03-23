import { uid } from './utils';
import { idbGet, idbPut, idbDelete } from './db';

// Firestore doc limit ~1MB, keep blob under 900KB
const MAX_BLOB_BYTES = 900 * 1024;

// Compress image via Canvas, ensuring result fits Firestore limit
function compressImage(dataUrl) {
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

      // Try JPEG at decreasing quality until under limit
      const qualities = [0.92, 0.8, 0.6, 0.4, 0.3];
      for (const q of qualities) {
        const result = canvas.toDataURL('image/jpeg', q);
        if (result.length <= MAX_BLOB_BYTES) {
          resolve(result);
          return;
        }
      }
      // Still too large — scale down further
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

// Extract data:URL blobs from questions, replace with fs:// ref keys
export async function extractBlobs(questions) {
  const blobs = {}; // key -> dataURL
  const cleaned = JSON.parse(JSON.stringify(questions));
  for (const q of cleaned) {
    if (!q.media) continue;
    for (const m of q.media) {
      if (m.url && m.url.startsWith('data:') && m.url.length > 200) {
        const key = 'blob_' + uid();
        // Compress images before storing
        if (m.type === 'image') {
          blobs[key] = await compressImage(m.url);
        } else {
          blobs[key] = m.url;
        }
        m.url = 'fs://' + key;
      }
    }
  }
  return { cleaned, blobs };
}

// Restore blob refs to data URLs
export async function restoreBlobs(questions) {
  const restored = JSON.parse(JSON.stringify(questions));
  for (const q of restored) {
    if (!q.media) continue;
    for (const m of q.media) {
      if (m.url && (m.url.startsWith('fs://') || m.url.startsWith('idb://'))) {
        const key = m.url.startsWith('fs://') ? m.url.slice(5) : m.url.slice(6);
        const dataUrl = await idbGet('blobs', key);
        m.url = dataUrl || '';
      }
    }
  }
  return restored;
}

// Save survey with blob extraction
export async function saveSurveyData(data, surveyQuestions) {
  const { cleaned, blobs } = await extractBlobs(surveyQuestions);
  // Save blobs
  for (const [key, val] of Object.entries(blobs)) {
    await idbPut('blobs', key, val);
  }
  return cleaned;
}

// Delete orphan blobs when survey is deleted
export async function deleteSurveyBlobs(questions) {
  if (!questions) return;
  for (const q of questions) {
    if (!q.media) continue;
    for (const m of q.media) {
      if (m.url && (m.url.startsWith('fs://') || m.url.startsWith('idb://'))) {
        const key = m.url.startsWith('fs://') ? m.url.slice(5) : m.url.slice(6);
        await idbDelete('blobs', key);
      }
    }
  }
}
