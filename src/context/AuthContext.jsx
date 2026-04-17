import { createContext, useContext, useEffect, useState } from "react";
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
} from "firebase/auth";
import { auth } from "../lib/firebase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [activated, setActivated] = useState(null); // null = loading, true/false = known
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const idTokenResult = await firebaseUser.getIdTokenResult();
        const claims = idTokenResult.claims;
        setRole(claims.role || null);
        // admins & it-experts are always activated; others check claim
        const isPrivileged = ["admin", "it-expert"].includes(claims.role);
        setActivated(isPrivileged ? true : claims.activated !== false);
        setUser(firebaseUser);
      } else {
        setUser(null);
        setRole(null);
        setActivated(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const login = (email, password) =>
    signInWithEmailAndPassword(auth, email, password);
  const logout = () => signOut(auth);
  const resetPassword = (email) => sendPasswordResetEmail(auth, email);

  const refreshClaims = async () => {
    if (auth.currentUser) {
      const idTokenResult = await auth.currentUser.getIdTokenResult(true);
      const claims = idTokenResult.claims;
      setRole(claims.role || null);
      const isPrivileged = ["admin", "it-expert"].includes(claims.role);
      setActivated(isPrivileged ? true : claims.activated !== false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        activated,
        loading,
        login,
        logout,
        resetPassword,
        refreshClaims,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
