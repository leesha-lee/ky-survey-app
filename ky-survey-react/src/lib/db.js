import { db } from './firebase';
import { doc, getDoc, getDocFromServer, setDoc, deleteDoc } from 'firebase/firestore';

const APP_DOC = doc(db, 'appData', 'main');

async function getDocSafe(ref) {
  try {
    return await getDocFromServer(ref);
  } catch {
    return await getDoc(ref);
  }
}

export async function loadData() {
  const snap = await getDocSafe(APP_DOC);
  if (snap.exists()) return snap.data();
  return { surveys: [], responses: {} };
}

export async function saveData(data) {
  await setDoc(APP_DOC, data);
}

// Blob CRUD — stored in blobs/{key} collection
export async function idbGet(store, key) {
  const ref = doc(db, 'blobs', key);
  const snap = await getDocSafe(ref);
  return snap.exists() ? snap.data().value : undefined;
}

export async function idbPut(store, key, value) {
  const ref = doc(db, 'blobs', key);
  await setDoc(ref, { value });
}

export async function idbDelete(store, key) {
  const ref = doc(db, 'blobs', key);
  await deleteDoc(ref);
}
