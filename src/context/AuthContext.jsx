// Auth state, sign in/out, and profile loading.
import { createContext, useContext, useEffect, useRef, useState } from "react";
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
import { AUDIT, logAction } from "../lib/audit";

const Ctx = createContext(null);

// Heartbeat interval for "user is still in app" pings (lastSeenAt).
const HEARTBEAT_MS = 60_000;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Session tracking refs (don't trigger re-render).
  const sessionStartRef = useRef(null); // ms epoch when session began
  const sessionRoleRef = useRef(null);
  const sessionUidRef = useRef(null);
  const heartbeatRef = useRef(null);
  const sessionEndedRef = useRef(false);

  // End-of-session bookkeeping: write SESSION_END with duration and stop heartbeat.
  const endSession = (reason = "logout") => {
    if (sessionEndedRef.current || !sessionUidRef.current) return;
    sessionEndedRef.current = true;
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
    const start = sessionStartRef.current;
    const durationSec = start ? Math.round((Date.now() - start) / 1000) : 0;
    logAction(
      AUDIT.SESSION_END,
      sessionUidRef.current,
      sessionRoleRef.current,
      { durationSec, reason },
    );
  };

  // Begin tracking once we know the user + role.
  const startSession = (uid, role) => {
    sessionUidRef.current = uid;
    sessionRoleRef.current = role;
    sessionStartRef.current = Date.now();
    sessionEndedRef.current = false;
    // Stamp profile with session start + first heartbeat.
    updateDoc(doc(db, COLLECTIONS.USERS, uid), {
      sessionStartAt: serverTimestamp(),
      lastSeenAt: serverTimestamp(),
    }).catch(() => {});
    if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    heartbeatRef.current = setInterval(() => {
      updateDoc(doc(db, COLLECTIONS.USERS, uid), {
        lastSeenAt: serverTimestamp(),
      }).catch(() => {});
    }, HEARTBEAT_MS);
  };

  // Best-effort end-session on tab close / refresh.
  useEffect(() => {
    const onUnload = () => endSession("unload");
    const onVisibility = () => {
      if (document.visibilityState === "hidden" && sessionUidRef.current) {
        // Lightweight ping so admin sees activity even without explicit logout.
        updateDoc(doc(db, COLLECTIONS.USERS, sessionUidRef.current), {
          lastSeenAt: serverTimestamp(),
        }).catch(() => {});
      }
    };
    window.addEventListener("beforeunload", onUnload);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("beforeunload", onUnload);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  useEffect(() => {
    return onAuthStateChanged(auth, async (fbUser) => {
      setLoading(true);
      if (!fbUser) {
        // Auth session ended (e.g. token revoked) — treat as session end.
        endSession("auth_state_cleared");
        sessionUidRef.current = null;
        sessionRoleRef.current = null;
        sessionStartRef.current = null;
        setUser(null);
        setProfile(null);
        setLoading(false);
        return;
      }
      const ref = doc(db, COLLECTIONS.USERS, fbUser.uid);
      let snap = await getDoc(ref);
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
      // Begin/refresh session tracking for this user.
      if (sessionUidRef.current !== fbUser.uid)
        startSession(fbUser.uid, data.role || "unknown");
      // Run holiday sync for every authenticated user so changes to
      // src/lib/holidaySeed.js propagate regardless of who logs in first.
      seedPublicHolidaysIfEmpty().catch(() => {});
    });
  }, []);

  // Sign in + status checks + audit.
  const signIn = async (email, password) => {
    const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
    const snap = await getDoc(doc(db, COLLECTIONS.USERS, cred.user.uid));
    if (!snap.exists()) {
      logAction(AUDIT.USER_LOGIN, cred.user.uid, ROLES.ADMIN, {
        email: cred.user.email,
      });
      return cred.user;
    }
    const data = snap.data();
    if (data.status === STATUS.PENDING) {
      await fbSignOut(auth);
      throw Object.assign(new Error("Account awaiting admin approval."), {
        code: "pending_approval",
      });
    }
    if (data.status === STATUS.DISABLED) {
      await fbSignOut(auth);
      throw new Error("Account has been disabled.");
    }
    updateDoc(doc(db, COLLECTIONS.USERS, cred.user.uid), {
      lastLoginAt: serverTimestamp(),
    }).catch(() => {});
    logAction(AUDIT.USER_LOGIN, cred.user.uid, data.role, {
      email: cred.user.email,
    });
    return cred.user;
  };

  // Sign out + audit.
  const signOut = async () => {
    if (auth.currentUser) {
      logAction(AUDIT.USER_LOGOUT, auth.currentUser.uid, profile?.role, {
        email: auth.currentUser.email,
      });
    }
    endSession("logout");
    await fbSignOut(auth);
  };

  // Refetch profile after mutations.
  const refreshProfile = async () => {
    if (!user) return;
    const snap = await getDoc(doc(db, COLLECTIONS.USERS, user.uid));
    if (snap.exists()) setProfile({ id: snap.id, ...snap.data() });
  };

  return (
    <Ctx.Provider
      value={{ user, profile, loading, signIn, signOut, refreshProfile }}
    >
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};
