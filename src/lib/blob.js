import { uid } from './utils';
import { idbGet, idbPut, idbDelete } from './db';

// Extract data:URL blobs from questions, replace with idb:// ref keys
export function extractBlobs(questions) {
  const blobs = {}; // key -> dataURL
  const cleaned = JSON.parse(JSON.stringify(questions));
  cleaned.forEach(q => {
    if (!q.media) return;
    q.media.forEach(m => {
      if (m.url && m.url.startsWith('data:') && m.url.length > 200) {
        const key = 'blob_' + uid();
        blobs[key] = m.url;
        m.url = 'idb://' + key;
      }
    });
  });
  return { cleaned, blobs };
}

// Restore blob refs to data URLs
export async function restoreBlobs(questions) {
  const restored = JSON.parse(JSON.stringify(questions));
  for (const q of restored) {
    if (!q.media) continue;
    for (const m of q.media) {
      if (m.url && m.url.startsWith('idb://')) {
        const key = m.url.slice(6);
        const dataUrl = await idbGet('blobs', key);
        m.url = dataUrl || '';
      }
    }
  }
  return restored;
}

// Save survey with blob extraction
export async function saveSurveyData(data, surveyQuestions) {
  const { cleaned, blobs } = extractBlobs(surveyQuestions);
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
      if (m.url && m.url.startsWith('idb://')) {
        await idbDelete('blobs', m.url.slice(6));
      }
    }
  }
}
