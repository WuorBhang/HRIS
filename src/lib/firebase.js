// Firebase init (auth + firestore + secondary app for admin user creation).
import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const cfg = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};
for (const [k, v] of Object.entries(cfg)) if (!v) throw new Error(`Missing VITE_FIREBASE_${k}`);

const app = getApps().find((a) => a.name === "[DEFAULT]") || initializeApp(cfg);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Returns secondary auth instance for admin-creates-user flow.
export const getSecondaryAuth = () =>
  getAuth(getApps().find((a) => a.name === "Secondary") || initializeApp(cfg, "Secondary"));
