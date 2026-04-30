import { useEffect, useState } from "react";
import {
  addDoc,
  collection,
  getDocs,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { useLocation } from "wouter";
import Layout from "../../components/Layout";
import ActivationGate from "../../components/ActivationGate";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../lib/firebase";
import { COLLECTIONS } from "../../lib/constants";
import { AUDIT_ACTIONS, logAction } from "../../lib/audit";

export default function ReportOvertime() {
  const { user, profile } = useAuth();
  const [, navigate] = useLocation();

  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [hours, setHours] = useState("1");
  const [notes, setNotes] = useState("");

  const [employerId, setEmployerId] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user) return;
      try {
        const snap = await getDocs(
          query(
            collection(db, COLLECTIONS.CONTRACTS),
            where("employeeId", "==", user.uid),
          ),
        );
        if (cancelled) return;
        const docs = snap.docs.map((d) => d.data());
        docs.sort(
          (a, b) =>
            (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0),
        );
        setEmployerId(docs[0]?.employerId || null);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("[Overtime] could not look up contract:", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!date) {
      setError("Pick a date.");
      return;
    }
    if (date > today) {
      setError("Date cannot be in the future.");
      return;
    }
    const numHours = parseFloat(hours);
    if (isNaN(numHours) || numHours <= 0 || numHours > 24) {
      setError("Hours must be between 0 and 24.");
      return;
    }
    if (!employerId) {
      setError(
        "You're not linked to an employer yet. Ask the admin to create a contract for you first.",
      );
      return;
    }

    setSubmitting(true);
    try {
      const ref = await addDoc(collection(db, COLLECTIONS.OVERTIME_RECORDS), {
        employeeId: user.uid,
        employerId,
        date,
        hours: numHours,
        notes: notes.trim(),
        isHoliday: false,
        status: "pending",
        createdAt: serverTimestamp(),
      });
      logAction(AUDIT_ACTIONS.OVERTIME_SUBMITTED, user.uid, profile?.role, {
        overtimeRecordId: ref.id,
        type: "overtime",
        date,
        hours: numHours,
        employerId,
      });
      setSuccess(
        `Submitted ${numHours}h for ${date}. Awaiting employer approval.`,
      );
      setHours("1");
      setNotes("");
    } catch (err) {
      setError(err.message || "Could not submit overtime.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-primary">
          Report overtime
        </h1>
        <button
          onClick={() => navigate("/employee/dashboard")}
          className="text-sm text-primary underline self-start sm:self-auto"
        >
          ← Back to dashboard
        </button>
      </div>

      <ActivationGate>
        <div className="bg-card rounded-lg shadow p-4 sm:p-6 max-w-2xl">
          {error && (
            <div className="mb-4 p-3 rounded-md border border-destructive/40 bg-destructive/10 text-destructive text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 p-3 rounded-md border border-green-300 bg-green-50 text-green-700 text-sm">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Date</label>
              <input
                type="date"
                value={date}
                max={today}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-md border border-border bg-card outline-none focus:ring-2 focus:ring-primary"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Future dates are not allowed.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Hours worked
              </label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                max="24"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-md border border-border bg-card outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="What did you work on?"
                className="w-full px-3 py-2 rounded-md border border-border bg-card outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="bg-primary text-primary-foreground px-5 py-2 rounded-md font-medium hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? "Submitting…" : "Submit overtime"}
            </button>
          </form>
        </div>
      </ActivationGate>
    </Layout>
  );
}
