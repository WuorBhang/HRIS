import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

for (const [k, v] of Object.entries(firebaseConfig)) {
  if (!v) throw new Error(`Missing Firebase env var for ${k}`);
}

const app = getApps().find((a) => a.name === "[DEFAULT]") || initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

export function getSecondaryAuth() {
  const name = "Secondary";
  const secondary =
    getApps().find((a) => a.name === name) || initializeApp(firebaseConfig, name);
  return getAuth(secondary);
}

export const ADMIN_EMAIL = (import.meta.env.VITE_ADMIN_EMAIL || "").toLowerCase().trim();

export default app;
