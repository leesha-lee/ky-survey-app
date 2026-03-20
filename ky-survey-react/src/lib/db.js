import { db } from './firebase';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';

const APP_DOC = doc(db, 'appData', 'main');

export async function loadData() {
  const snap = await getDoc(APP_DOC);
  if (snap.exists()) return snap.data();
  return { surveys: [], responses: {} };
}

export async function saveData(data) {
  await setDoc(APP_DOC, data);
}

// Blob CRUD — stored in blobs/{key} collection
export async function idbGet(store, key) {
  const ref = doc(db, 'blobs', key);
  const snap = await getDoc(ref);
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
