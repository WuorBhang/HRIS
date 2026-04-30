// Self-contained "Report work on a public holiday" form.
// Used both on the dedicated /employee/holiday page and inline on the
// employee dashboard. Writes to overtime_clock_records with isHoliday=true
// so the same employer Timesheets approval flow handles it.

import { useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { db } from "../lib/firebase";
import { COLLECTIONS } from "../lib/constants";
import { AUDIT_ACTIONS, logAction } from "../lib/audit";
import { subscribeHolidays } from "../lib/holidayService";
import { formatDate } from "../lib/utils";

export default function HolidayWorkForm() {
  const { user, profile } = useAuth();

  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState("");
  const [hours, setHours] = useState("8");
  const [notes, setNotes] = useState("");

  const [holidays, setHolidays] = useState([]);
  const [employerId, setEmployerId] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const unsub = subscribeHolidays(setHolidays);
    return () => unsub();
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user) return;
      const snap = await getDocs(
        query(
          collection(db, COLLECTIONS.CONTRACTS),
          where("employeeId", "==", user.uid),
          orderBy("createdAt", "desc"),
        ),
      );
      if (!cancelled) setEmployerId(snap.docs[0]?.data().employerId || null);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const eligibleHolidays = useMemo(
    () =>
      holidays
        .filter((h) => h.date <= today)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [holidays, today],
  );

  const holidayByDate = useMemo(() => {
    const m = {};
    for (const h of holidays) m[h.date] = h;
    return m;
  }, [holidays]);

  const selectedHoliday = date ? holidayByDate[date] : null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!date) return setError("Pick a holiday.");
    if (!holidayByDate[date])
      return setError("Selected date is not a public holiday.");
    if (date > today) return setError("Date cannot be in the future.");
    const numHours = parseFloat(hours);
    if (isNaN(numHours) || numHours <= 0 || numHours > 24)
      return setError("Hours must be between 0 and 24.");
    if (!employerId)
      return setError(
        "We couldn't find your employer link yet. Please refresh or contact admin.",
      );

    setSubmitting(true);
    try {
      const ref = await addDoc(collection(db, COLLECTIONS.OVERTIME_RECORDS), {
        employeeId: user.uid,
        employerId,
        date,
        hours: numHours,
        notes: notes.trim(),
        isHoliday: true,
        holidayName: selectedHoliday?.name || null,
        status: "pending",
        createdAt: serverTimestamp(),
      });
      logAction(AUDIT_ACTIONS.HOLIDAY_WORK_SUBMITTED, user.uid, profile?.role, {
        overtimeRecordId: ref.id,
        type: "holiday_work",
        date,
        hours: numHours,
        holidayName: selectedHoliday?.name || null,
        employerId,
      });
      setSuccess(
        `Submitted ${numHours}h on ${selectedHoliday?.name || date}. Awaiting employer approval.`,
      );
      setDate("");
      setHours("8");
      setNotes("");
    } catch (err) {
      setError(err.message || "Could not submit holiday work.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
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

      {eligibleHolidays.length === 0 ? (
        <div className="text-sm text-muted-foreground">
          No past public holidays available yet. Public holidays are loaded
          automatically — please check back after the next holiday.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Public holiday
            </label>
            <select
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-md border border-border bg-card outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">— Pick a holiday —</option>
              {eligibleHolidays.map((h) => (
                <option key={h.id} value={h.date}>
                  {formatDate(h.date)} — {h.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground mt-1">
              Only Kenya public holidays you actually worked are listed.
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
              placeholder="What did you do?"
              className="w-full px-3 py-2 rounded-md border border-border bg-card outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="bg-primary text-primary-foreground px-5 py-2 rounded-md font-medium hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? "Submitting…" : "Submit holiday work"}
          </button>
        </form>
      )}
    </div>
  );
}
