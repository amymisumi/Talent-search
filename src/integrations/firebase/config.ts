import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyDvQEfnF-ZJzWScXhFfOPw7fEqwHSoi2qc",
  authDomain: "africatalent-ec2e9.firebaseapp.com",
  projectId: "africatalent-ec2e9",
  storageBucket: "africatalent-ec2e9.firebasestorage.app",
  messagingSenderId: "142941304921",
  appId: "1:142941304921:web:a5ea8b14198400c4f45948"
};

// Initialize Firebase (guard to avoid duplicate initialization)
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
