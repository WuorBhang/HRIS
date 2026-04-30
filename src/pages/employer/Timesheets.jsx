import { useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { Check, X, Clock, CalendarDays } from "lucide-react";
import Layout from "../../components/Layout";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../lib/firebase";
import { COLLECTIONS } from "../../lib/constants";
import { formatDate } from "../../lib/utils";
import { AUDIT_ACTIONS, logAction } from "../../lib/audit";

const TABS = [
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
];

const FILTERS = [
  { key: "all", label: "All" },
  { key: "overtime", label: "Overtime" },
  { key: "holiday", label: "Holiday work" },
];

export default function EmployerTimesheets() {
  const { user, profile } = useAuth();
  const [records, setRecords] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [tab, setTab] = useState("pending");
  const [filter, setFilter] = useState("all");
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const unsubR = onSnapshot(
      query(
        collection(db, COLLECTIONS.OVERTIME_RECORDS),
        where("employerId", "==", user.uid),
      ),
      (snap) => {
        setRecords(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
    );
    const unsubC = onSnapshot(
      query(
        collection(db, COLLECTIONS.CONTRACTS),
        where("employerId", "==", user.uid),
      ),
      (snap) => setContracts(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    );
    return () => {
      unsubR();
      unsubC();
    };
  }, [user]);

  const employeeNameById = useMemo(() => {
    const m = {};
    for (const c of contracts) {
      if (c.employeeId && c.employeeName) m[c.employeeId] = c.employeeName;
    }
    return m;
  }, [contracts]);

  const sorted = useMemo(() => {
    return [...records]
      .filter((r) => r.status === tab)
      .filter((r) =>
        filter === "all"
          ? true
          : filter === "holiday"
            ? r.isHoliday === true
            : r.isHoliday !== true,
      )
      .sort((a, b) => {
        const at = a.createdAt?.toMillis?.() || 0;
        const bt = b.createdAt?.toMillis?.() || 0;
        return bt - at;
      });
  }, [records, tab, filter]);

  const counts = useMemo(() => {
    const c = { pending: 0, approved: 0, rejected: 0 };
    for (const r of records) if (c[r.status] !== undefined) c[r.status]++;
    return c;
  }, [records]);

  const decide = async (r, status) => {
    setBusyId(r.id);
    setError("");
    try {
      await updateDoc(doc(db, COLLECTIONS.OVERTIME_RECORDS, r.id), {
        status,
        decidedAt: serverTimestamp(),
        decidedBy: user.uid,
      });
      const action = r.isHoliday
        ? status === "approved"
          ? AUDIT_ACTIONS.HOLIDAY_WORK_APPROVED
          : AUDIT_ACTIONS.HOLIDAY_WORK_REJECTED
        : status === "approved"
          ? AUDIT_ACTIONS.OVERTIME_APPROVED
          : AUDIT_ACTIONS.OVERTIME_REJECTED;
      logAction(action, user.uid, profile?.role, {
        overtimeRecordId: r.id,
        employeeId: r.employeeId,
        date: r.date,
        hours: r.hours,
        type: r.isHoliday ? "holiday_work" : "overtime",
      });
    } catch (err) {
      setError(err.message || "Could not update record.");
    } finally {
      setBusyId("");
    }
  };

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-primary">
          Timesheets
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Review overtime and public-holiday hours submitted by your team.
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-md border border-destructive/40 bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      <div className="bg-card rounded-lg shadow">
        <div className="flex border-b border-border overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 sm:px-5 py-3 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition ${
                tab === t.key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
              <span className="ml-2 text-xs bg-muted/50 text-muted-foreground px-1.5 py-0.5 rounded">
                {counts[t.key] || 0}
              </span>
            </button>
          ))}
        </div>

        <div className="px-4 sm:px-5 pt-3 flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`text-xs px-3 py-1.5 rounded-full border transition ${
                filter === f.key
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground border-border hover:text-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            Loading…
          </div>
        ) : sorted.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            {tab === "pending"
              ? "No pending timesheet entries right now."
              : `No ${tab} entries to show.`}
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {sorted.map((r) => (
              <li key={r.id} className="p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-foreground truncate">
                        {employeeNameById[r.employeeId] || "Employee"}
                      </span>
                      {r.isHoliday ? (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-accent/20 text-accent font-medium inline-flex items-center gap-1">
                          <CalendarDays className="w-3 h-3" />
                          {r.holidayName || "Holiday work"}
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium inline-flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Overtime
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {r.hours}h on {formatDate(r.date)}
                      </span>
                    </div>
                    {r.notes && (
                      <p className="text-sm mt-2 bg-muted/30 rounded-md px-3 py-2">
                        {r.notes}
                      </p>
                    )}
                  </div>

                  {tab === "pending" ? (
                    <div className="flex gap-2 shrink-0">
                      <button
                        disabled={busyId === r.id}
                        onClick={() => decide(r, "approved")}
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-md bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                      >
                        <Check className="w-4 h-4" />
                        Approve
                      </button>
                      <button
                        disabled={busyId === r.id}
                        onClick={() => decide(r, "rejected")}
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-md border border-border text-destructive hover:bg-destructive/10 disabled:opacity-50"
                      >
                        <X className="w-4 h-4" />
                        Reject
                      </button>
                    </div>
                  ) : (
                    <span
                      className={`text-xs px-2 py-1 rounded-full font-medium self-start shrink-0 ${
                        r.status === "approved"
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {r.status}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Layout>
  );
}
