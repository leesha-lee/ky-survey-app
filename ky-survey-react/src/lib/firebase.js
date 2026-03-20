import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDqUL-n5fnkLl3dkJESD_dAzePk-cbv-Ek",
  authDomain: "ky-ux-survey.firebaseapp.com",
  projectId: "ky-ux-survey",
  storageBucket: "ky-ux-survey.firebasestorage.app",
  messagingSenderId: "181025801264",
  appId: "1:181025801264:web:bf1b57c89347fcda0a99f5",
  measurementId: "G-J58YCE858P",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
