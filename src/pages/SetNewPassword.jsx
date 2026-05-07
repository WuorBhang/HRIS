// Force temp-password change after first login.
import { useState } from "react";
import { useLocation } from "wouter";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from "firebase/auth";
import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { auth, db } from "../lib/firebase";
import { COLLECTIONS, ROLES, STATUS } from "../lib/constants";
import { AUDIT, logAction } from "../lib/audit";
import { Input, Button, Alert } from "../lib/ui";

export default function SetNewPassword() {
  const { user, profile, refreshProfile } = useAuth();
  const [, navigate] = useLocation();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [busy, setBusy] = useState(false);

  // Submit handler.
  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    setOk("");
    if (next.length < 8)
      return setErr("Password must be at least 8 characters.");
    if (next !== confirm) return setErr("Passwords do not match.");
    setBusy(true);
    try {
      const cred = EmailAuthProvider.credential(user.email, current.trim());
      await reauthenticateWithCredential(auth.currentUser, cred);
      await updatePassword(auth.currentUser, next);
      // Only flip approved -> active to comply with firestore.rules.
      const updates = {
        mustChangePassword: false,
        updatedAt: serverTimestamp(),
      };
      if (profile?.status === STATUS.APPROVED) updates.status = STATUS.ACTIVE;
      await updateDoc(doc(db, COLLECTIONS.USERS, user.uid), updates);
      logAction(AUDIT.PASSWORD_CHANGED, user.uid, profile?.role, {
        email: user.email,
      });
      await refreshProfile();
      setOk("Password updated. Redirecting…");
      const map = {
        [ROLES.ADMIN]: "/admin/dashboard",
        [ROLES.EMPLOYER]: "/employer/dashboard",
        [ROLES.EMPLOYEE]: "/employee/dashboard",
      };
      setTimeout(() => navigate(map[profile?.role] || "/dashboard"), 600);
    } catch (e2) {
      const code = e2.code || "";
      setErr(
        code === "auth/invalid-credential" ||
          code === "auth/wrong-password" ||
          code === "auth/invalid-login-credentials"
          ? "Temporary password is incorrect. Ask the admin to reset it if you've lost it."
          : code === "auth/too-many-requests"
            ? "Too many attempts. Try again in a few minutes."
            : code === "auth/weak-password"
              ? "New password is too weak."
              : e2.message,
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="bg-card rounded-lg shadow p-6 sm:p-8 w-full max-w-md">
        <h1 className="text-xl font-bold text-primary mb-1">
          Set a new password
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          Replace your temporary password to activate your account.
        </p>
        <Alert tone="error">{err}</Alert>
        <Alert tone="success">{ok}</Alert>
        <form onSubmit={onSubmit} className="space-y-4">
          <Input
            label="Temporary password"
            type="password"
            value={current}
            onChange={setCurrent}
            required
          />
          <Input
            label="New password"
            type="password"
            value={next}
            onChange={setNext}
            required
          />
          <Input
            label="Confirm new password"
            type="password"
            value={confirm}
            onChange={setConfirm}
            required
          />
          <Button type="submit" disabled={busy} className="w-full">
            {busy ? "Updating…" : "Update password"}
          </Button>
        </form>
      </div>
    </div>
  );
}
