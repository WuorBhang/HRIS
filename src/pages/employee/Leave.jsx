import { useEffect, useMemo, useState } from "react";
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
import { COLLECTIONS, LEAVE_TYPES } from "../../lib/constants";
import { AUDIT_ACTIONS, logAction } from "../../lib/audit";

export default function LeaveRequest() {
  const { user, profile } = useAuth();
  const [, navigate] = useLocation();

  const [type, setType] = useState(LEAVE_TYPES[0]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
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
        console.error("[Leave] could not look up contract:", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const dayCount = useMemo(() => {
    if (!startDate || !endDate) return 0;
    const s = new Date(startDate + "T00:00:00");
    const e = new Date(endDate + "T00:00:00");
    if (isNaN(s) || isNaN(e) || e < s) return 0;
    return Math.round((e - s) / (1000 * 60 * 60 * 24)) + 1;
  }, [startDate, endDate]);

  const sickRequiresNotes = type === "Sick";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!startDate || !endDate) {
      setError("Pick a start and end date.");
      return;
    }
    if (endDate < startDate) {
      setError("End date cannot be before start date.");
      return;
    }
    if (sickRequiresNotes && notes.trim().length === 0) {
      setError("Notes are required for sick leave.");
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
      const ref = await addDoc(collection(db, COLLECTIONS.LEAVE_REQUESTS), {
        employeeId: user.uid,
        employerId,
        type,
        startDate,
        endDate,
        days: dayCount,
        notes: notes.trim(),
        status: "pending",
        createdAt: serverTimestamp(),
      });
      logAction(AUDIT_ACTIONS.LEAVE_SUBMITTED, user.uid, profile?.role, {
        leaveRequestId: ref.id,
        type,
        startDate,
        endDate,
        days: dayCount,
        employerId,
      });
      setSuccess(
        `Submitted ${dayCount}-day ${type.toLowerCase()} leave request. Awaiting employer approval.`,
      );
      setStartDate("");
      setEndDate("");
      setNotes("");
    } catch (err) {
      setError(err.message || "Could not submit leave request.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-primary">
          Request leave
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
              <label className="block text-sm font-medium mb-1">
                Leave type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-border bg-card outline-none focus:ring-2 focus:ring-primary"
              >
                {LEAVE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Start date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-md border border-border bg-card outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  End date
                </label>
                <input
                  type="date"
                  value={endDate}
                  min={startDate || undefined}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-md border border-border bg-card outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div className="text-sm bg-muted/40 rounded-md px-3 py-2">
              Total days requested:{" "}
              <span className="font-semibold text-primary">
                {dayCount > 0
                  ? `${dayCount} day${dayCount > 1 ? "s" : ""}`
                  : "—"}
              </span>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Notes{" "}
                {sickRequiresNotes && (
                  <span className="text-destructive">*</span>
                )}
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder={
                  sickRequiresNotes ? "Required for sick leave" : "Optional"
                }
                required={sickRequiresNotes}
                className="w-full px-3 py-2 rounded-md border border-border bg-card outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="bg-primary text-primary-foreground px-5 py-2 rounded-md font-medium hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? "Submitting…" : "Submit leave request"}
            </button>
          </form>
        </div>
      </ActivationGate>
    </Layout>
  );
}
