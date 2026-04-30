import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from "firebase/auth";
import { ArrowLeft, KeyRound, Loader2 } from "lucide-react";
import Layout from "../components/Layout";
import { auth } from "../lib/firebase";
import { useAuth } from "../context/AuthContext";
import { AUDIT_ACTIONS, logAction } from "../lib/audit";

export default function ChangePassword() {
  const [, setLocation] = useLocation();
  const { profile } = useAuth();
  const [pwCurrent, setPwCurrent] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setMsg("");
    setErr("");
    if (pwNew.length < 8) {
      setErr("New password must be at least 8 characters.");
      return;
    }
    if (pwNew !== pwConfirm) {
      setErr("Passwords do not match.");
      return;
    }
    setSaving(true);
    try {
      const cred = EmailAuthProvider.credential(
        auth.currentUser.email,
        pwCurrent,
      );
      await reauthenticateWithCredential(auth.currentUser, cred);
      await updatePassword(auth.currentUser, pwNew);
      logAction(
        AUDIT_ACTIONS.PASSWORD_CHANGED,
        auth.currentUser.uid,
        profile?.role,
        { email: auth.currentUser.email, via: "change-password" },
      );
      setPwCurrent("");
      setPwNew("");
      setPwConfirm("");
      setMsg("Password changed successfully.");
      setTimeout(() => setLocation("/profile"), 1200);
    } catch (e2) {
      const code = e2.code ?? "";
      setErr(
        code === "auth/invalid-credential" || code === "auth/wrong-password"
          ? "Current password is incorrect."
          : e2.message || "Could not change password.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-lg">
        <Link
          href="/profile"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to profile
        </Link>

        <div className="bg-card rounded-lg shadow p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <KeyRound className="w-5 h-5 text-primary" />
            <h1 className="text-xl font-bold text-primary">Change password</h1>
          </div>
          <p className="text-sm text-muted-foreground mb-5">
            For your security, please confirm your current password before
            setting a new one.
          </p>

          {msg && (
            <div className="mb-3 p-3 rounded-md border border-green-300 bg-green-50 text-green-700 text-sm">
              {msg}
            </div>
          )}
          {err && (
            <div className="mb-3 p-3 rounded-md border border-destructive/40 bg-destructive/10 text-destructive text-sm">
              {err}
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-4">
            <Field
              label="Current password"
              type="password"
              value={pwCurrent}
              onChange={setPwCurrent}
              required
            />
            <Field
              label="New password"
              type="password"
              value={pwNew}
              onChange={setPwNew}
              required
            />
            <Field
              label="Confirm new password"
              type="password"
              value={pwConfirm}
              onChange={setPwConfirm}
              required
            />
            <button
              type="submit"
              disabled={saving}
              className="bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium hover:opacity-90 disabled:opacity-50 inline-flex items-center"
            >
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {saving ? "Updating…" : "Update password"}
            </button>
          </form>
        </div>
      </div>
    </Layout>
  );
}

function Field({ label, value, onChange, type = "text", required }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full px-3 py-2 rounded-md border border-border bg-card focus:ring-2 focus:ring-primary outline-none"
      />
    </div>
  );
}
