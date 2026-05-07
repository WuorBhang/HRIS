// Self-service password change inside the app.
import { useState } from "react";
import { useLocation } from "wouter";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from "firebase/auth";
import { useAuth } from "../context/AuthContext";
import { auth } from "../lib/firebase";
import { AUDIT, logAction } from "../lib/audit";
import { Input, Button, Alert, Card, PageHeader } from "../lib/ui";
import Layout from "../components/Layout";

export default function ChangePassword() {
  const { user, profile } = useAuth();
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
      const cred = EmailAuthProvider.credential(user.email, current);
      await reauthenticateWithCredential(auth.currentUser, cred);
      await updatePassword(auth.currentUser, next);
      logAction(AUDIT.PASSWORD_CHANGED, user.uid, profile?.role, {
        email: user.email,
      });
      setOk("Password updated.");
      setTimeout(() => navigate("/profile"), 1200);
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Layout>
      <PageHeader
        title="Change password"
        subtitle="Update your account password."
      />
      <Card className="max-w-md">
        <Alert tone="error">{err}</Alert>
        <Alert tone="success">{ok}</Alert>
        <form onSubmit={onSubmit} className="space-y-4">
          <Input
            label="Current password"
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
          <Button type="submit" disabled={busy}>
            {busy ? "Updating…" : "Update password"}
          </Button>
        </form>
      </Card>
    </Layout>
  );
}
