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
import UpcomingHolidays from "../../components/UpcomingHolidays";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../lib/firebase";
import { COLLECTIONS } from "../../lib/constants";
import { subscribeHolidays } from "../../lib/holidayService";
import { AUDIT_ACTIONS, logAction } from "../../lib/audit";

export default function ReportHoliday() {
  const { user, profile } = useAuth();
  const [, navigate] = useLocation();

  const [holidays, setHolidays] = useState([]);
  const [employerId, setEmployerId] = useState(null);
  const [loadingMeta, setLoadingMeta] = useState(true);

  const [holidayId, setHolidayId] = useState("");
  const [hours, setHours] = useState("8");
  const [notes, setNotes] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // load holidays + the employee's employer id (from contracts)
  useEffect(() => {
    const unsub = subscribeHolidays((list) => setHolidays(list));
    return () => unsub();
  }, []);

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
        console.error("[Holiday] could not look up contract:", err);
      } finally {
        if (!cancelled) setLoadingMeta(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const sortedHolidays = useMemo(() => {
    // show all holidays from earliest to latest, mark past ones
    return holidays
      .map((h) => ({ ...h, dateObj: new Date(h.date + "T00:00:00") }))
      .sort((a, b) => a.dateObj - b.dateObj);
  }, [holidays]);

  const selected = sortedHolidays.find((h) => h.id === holidayId);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!selected) {
      setError("Please pick a public holiday from the calendar.");
      return;
    }
    const numHours = parseFloat(hours);
    if (isNaN(numHours) || numHours <= 0 || numHours > 24) {
      setError("Hours must be a number between 0 and 24.");
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
        date: selected.date,
        hours: numHours,
        notes: notes.trim(),
        isHoliday: true,
        holidayName: selected.name,
        status: "pending",
        createdAt: serverTimestamp(),
      });
      logAction(AUDIT_ACTIONS.HOLIDAY_WORK_SUBMITTED, user.uid, profile?.role, {
        overtimeRecordId: ref.id,
        type: "holiday_work",
        date: selected.date,
        hours: numHours,
        holidayName: selected.name,
        employerId,
      });
      setSuccess(
        `Submitted ${numHours}h for ${selected.name} (${selected.date}). Awaiting employer approval.`,
      );
      setHolidayId("");
      setHours("8");
      setNotes("");
    } catch (err) {
      setError(err.message || "Could not submit report.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-primary">
          Report holiday work
        </h1>
        <button
          onClick={() => navigate("/employee/dashboard")}
          className="text-sm text-primary underline self-start sm:self-auto"
        >
          ← Back to dashboard
        </button>
      </div>

      <UpcomingHolidays />

      <div className="bg-card rounded-lg shadow p-4 sm:p-6 max-w-2xl">
        {loadingMeta ? (
          <div className="text-muted-foreground text-sm">Loading…</div>
        ) : (
          <>
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
                  Public holiday date
                </label>
                <select
                  value={holidayId}
                  onChange={(e) => setHolidayId(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-md border border-border bg-card outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">— Select a Kenya public holiday —</option>
                  {sortedHolidays.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.dateObj.toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}{" "}
                      — {h.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground mt-1">
                  Only Kenya public holidays from the calendar can be selected.
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
                {submitting ? "Submitting…" : "Submit holiday report"}
              </button>
            </form>
          </>
        )}
      </div>
    </Layout>
  );
}
