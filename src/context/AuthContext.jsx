import { createContext, useContext, useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
} from "firebase/auth";
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import { COLLECTIONS, ROLES, STATUS } from "../lib/constants";
import { seedPublicHolidaysIfEmpty } from "../lib/holidayService";
import { AUDIT_ACTIONS, logAction } from "../lib/audit";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      setLoading(true);
      if (!fbUser) {
        setUser(null);
        setProfile(null);
        setLoading(false);
        return;
      }

      const ref = doc(db, COLLECTIONS.USERS, fbUser.uid);
      let snap = await getDoc(ref);

      // First-login admin bootstrap.
      // Any Firebase Auth user that has no Firestore profile yet was created
      // manually in the Firebase Console (the in-app create-user flow always
      // pre-creates a Firestore profile with role + status). We treat those
      // accounts as admins so the project owner can provision admins simply
      // by creating them in the Firebase Console.
      if (!snap.exists()) {
        await setDoc(ref, {
          uid: fbUser.uid,
          email: fbUser.email,
          fullName:
            fbUser.displayName || fbUser.email?.split("@")[0] || "Admin",
          phone: "",
          role: ROLES.ADMIN,
          status: STATUS.ACTIVE,
          mustChangePassword: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        snap = await getDoc(ref);
      }

      const data = snap.data();
      setUser(fbUser);
      setProfile({ id: snap.id, ...data });
      setLoading(false);

      // Auto-seed Kenya public holidays on first admin login (rules allow admin only)
      if (data.role === ROLES.ADMIN) {
        seedPublicHolidaysIfEmpty().catch(() => {});
      }
    });
    return () => unsub();
  }, []);

  async function signIn(email, password) {
    const cred = await signInWithEmailAndPassword(auth, email.trim(), password);

    const snap = await getDoc(doc(db, COLLECTIONS.USERS, cred.user.uid));

    // No Firestore profile yet → first-login admin (created in Firebase Console).
    // The onAuthStateChanged listener will create the profile.
    if (!snap.exists()) {
      logAction(AUDIT_ACTIONS.USER_LOGIN, cred.user.uid, ROLES.ADMIN, {
        email: cred.user.email,
        bootstrap: true,
      });
      return cred.user;
    }

    const data = snap.data();
    if (data.status === STATUS.PENDING) {
      await fbSignOut(auth);
      const err = new Error("Your account is awaiting admin approval.");
      err.code = "pending_approval";
      throw err;
    }
    if (data.status === STATUS.DISABLED) {
      await fbSignOut(auth);
      throw new Error("Your account has been disabled. Contact admin.");
    }

    // Stamp lastLoginAt and write an audit entry. Both are best-effort.
    updateDoc(doc(db, COLLECTIONS.USERS, cred.user.uid), {
      lastLoginAt: serverTimestamp(),
    }).catch(() => {});
    logAction(AUDIT_ACTIONS.USER_LOGIN, cred.user.uid, data.role, {
      email: cred.user.email,
      fullName: data.fullName || "",
    });

    return cred.user;
  }

  async function signOut() {
    const current = auth.currentUser;
    if (current) {
      logAction(AUDIT_ACTIONS.USER_LOGOUT, current.uid, profile?.role, {
        email: current.email,
      });
    }
    await fbSignOut(auth);
  }

  async function refreshProfile() {
    if (!user) return;
    const snap = await getDoc(doc(db, COLLECTIONS.USERS, user.uid));
    if (snap.exists()) setProfile({ id: snap.id, ...snap.data() });
  }

  return (
    <AuthContext.Provider
      value={{ user, profile, loading, signIn, signOut, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
