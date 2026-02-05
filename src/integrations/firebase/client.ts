import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getStorage, connectStorageEmulator } from "firebase/storage";

// Firebase configuration from Firebase Console
const firebaseConfig = {
  apiKey: "AIzaSyCiwbCtj24dnkkPL_GO_EzIOYxrxbQgoxA",
  authDomain: "africatalent-ec2e9.firebaseapp.com",
  databaseURL: "https://africatalent-ec2e9-default-rtdb.firebaseio.com",
  projectId: "africatalent-ec2e9",
  storageBucket: "africatalent-ec2e9.firebasestorage.app",
  messagingSenderId: "142941304921",
  appId: "1:142941304921:web:a5ea8b14198400c4f45948"
};

// Log Firebase config for debugging (remove in production)
console.log("Firebase Config:", {
  ...firebaseConfig,
  apiKey: firebaseConfig.apiKey ? "[HIDDEN]" : "[MISSING]"
});

// Initialize Firebase (guard to avoid duplicate initialization in dev/hot-reload)
let app;
try {
  app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  console.log("Firebase initialized successfully");
} catch (error) {
  console.error("Firebase initialization error:", error);
  throw new Error("Failed to initialize Firebase");
}

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Use emulators in development (commented out to use production Firebase)
// if (import.meta.env.DEV) {
//   try {
//     connectAuthEmulator(auth, "http://localhost:9099", { disableWarnings: true });
//     connectFirestoreEmulator(db, 'localhost', 8080);
//     connectStorageEmulator(storage, 'localhost', 9199);
//     console.log("Connected to Firebase emulators");
//   } catch (error) {
//     console.warn("Could not connect to Firebase emulators:", error);
//   }
// }

export default app;
