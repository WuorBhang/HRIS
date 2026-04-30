import { useState } from "react";
import { useLocation } from "wouter";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from "firebase/auth";
import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import { useAuth } from "../context/AuthContext";
import { COLLECTIONS, ROLES, STATUS } from "../lib/constants";
import { AUDIT_ACTIONS, logAction } from "../lib/audit";

function dashboardPathForRole(role) {
  if (role === ROLES.ADMIN) return "/admin/dashboard";
  if (role === ROLES.EMPLOYER) return "/employer/dashboard";
  if (role === ROLES.EMPLOYEE) return "/employee/dashboard";
  return "/dashboard";
}

export default function SetNewPassword() {
  const { user, profile, refreshProfile, signOut } = useAuth();
  const [, navigate] = useLocation();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const cred = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(auth.currentUser, cred);
      await updatePassword(auth.currentUser, newPassword);
      await updateDoc(doc(db, COLLECTIONS.USERS, user.uid), {
        mustChangePassword: false,
        status: STATUS.ACTIVE,
        updatedAt: serverTimestamp(),
      });
      logAction(AUDIT_ACTIONS.PASSWORD_CHANGED, user.uid, profile?.role, {
        email: user.email,
        via: "first-login",
      });
      await refreshProfile();
      setSuccess(true);
      const target = dashboardPathForRole(profile?.role);
      setTimeout(() => navigate(target, { replace: true }), 600);
    } catch (err) {
      if (
        err.code === "auth/invalid-credential" ||
        err.code === "auth/wrong-password"
      ) {
        setError("The temporary password is incorrect.");
      } else {
        setError(err.message || "Could not update password.");
      }
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md bg-card rounded-lg shadow-lg p-8">
        <h1 className="text-2xl font-bold text-primary mb-1">
          Set your new password
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          Welcome {profile?.fullName || ""}. Replace your temporary password
          before continuing.
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-md border border-destructive/40 bg-destructive/10 text-sm text-destructive">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 rounded-md border border-green-500/40 bg-green-500/10 text-sm text-green-700">
            Password updated. Taking you to your dashboard…
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Temporary password
            </label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-border bg-card focus:ring-2 focus:ring-primary outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              New password
            </label>
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-border bg-card focus:ring-2 focus:ring-primary outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Confirm new password
            </label>
            <input
              type="password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-border bg-card focus:ring-2 focus:ring-primary outline-none"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleCancel}
              disabled={success}
              className="flex-1 border border-border py-2 rounded-md hover:bg-muted/30 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || success}
              className="flex-1 bg-primary text-primary-foreground py-2 rounded-md font-medium hover:opacity-90 disabled:opacity-50"
            >
              {success
                ? "Redirecting…"
                : loading
                  ? "Saving…"
                  : "Save & continue"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
