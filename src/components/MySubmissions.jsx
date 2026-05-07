// Employee submissions list (leave / overtime / holiday) with real-time status.
import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { CheckCircle2, XCircle, Clock } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { db } from "../lib/firebase";
import { COLLECTIONS } from "../lib/constants";
import { formatDate, formatTs, sortByCreated } from "../lib/utils";
import { StatusPill } from "../lib/ui";

// Status icon per state.
const Icon = ({ s }) =>
  s === "approved" ? (
    <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
  ) : s === "rejected" ? (
    <XCircle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
  ) : (
    <Clock className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
  );

const Pill = ({ t, children }) => {
  const cls =
    t === "green"
      ? "bg-green-100 text-green-700"
      : t === "red"
        ? "bg-red-100 text-red-700"
        : "bg-amber-100 text-amber-700";
  return (
    <span className={`px-2 py-0.5 rounded-full font-medium text-xs ${cls}`}>
      {children}
    </span>
  );
};

export default function MySubmissions({ mode }) {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const col =
      mode === "leave"
        ? COLLECTIONS.LEAVE_REQUESTS
        : COLLECTIONS.OVERTIME_RECORDS;
    return onSnapshot(
      query(collection(db, col), where("employeeId", "==", user.uid)),
      (s) => {
        setItems(s.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      () => setLoading(false),
    );
  }, [user, mode]);

  // Filter overtime / holiday by isHoliday flag.
  const filtered = useMemo(() => {
    if (mode === "overtime") return items.filter((i) => !i.isHoliday);
    if (mode === "holiday") return items.filter((i) => i.isHoliday);
    return items;
  }, [items, mode]);

  const sorted = useMemo(() => sortByCreated(filtered), [filtered]);
  const counts = useMemo(() => {
    const c = { pending: 0, approved: 0, rejected: 0 };
    for (const i of filtered) if (i.status in c) c[i.status]++;
    return c;
  }, [filtered]);

  const title =
    mode === "leave"
      ? "My leave requests"
      : mode === "overtime"
        ? "My overtime submissions"
        : "My holiday-work submissions";

  return (
    <section className="mt-8 bg-card rounded-lg shadow p-4 sm:p-6 max-w-2xl">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h2 className="text-base sm:text-lg font-semibold text-primary">
          {title}
        </h2>
        <div className="flex items-center gap-2 text-xs">
          <Pill t="amber">Pending {counts.pending}</Pill>
          <Pill t="green">Approved {counts.approved}</Pill>
          <Pill t="red">Rejected {counts.rejected}</Pill>
        </div>
      </div>
      {loading ? (
        <div className="py-8 text-center text-sm text-muted-foreground">
          Loading…
        </div>
      ) : !sorted.length ? (
        <div className="py-8 text-center text-sm text-muted-foreground">
          No submissions yet.
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {sorted.map((it) => {
            // Primary / secondary line per mode.
            const primary =
              mode === "leave"
                ? `${it.type || "Leave"} · ${it.days || 0} day${it.days === 1 ? "" : "s"}`
                : `${mode === "holiday" ? "Holiday work" : "Overtime"} · ${it.hours}h`;
            const secondary =
              mode === "leave"
                ? `${formatDate(it.startDate)} → ${formatDate(it.endDate)}`
                : it.holidayName
                  ? `${formatDate(it.date)} — ${it.holidayName}`
                  : formatDate(it.date);
            return (
              <li key={it.id} className="py-3 flex items-start gap-3">
                <Icon s={it.status || "pending"} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{primary}</div>
                  <div className="text-xs text-muted-foreground">
                    {secondary}
                  </div>
                  {it.notes && (
                    <div className="text-xs text-muted-foreground mt-1 italic line-clamp-2">
                      "{it.notes}"
                    </div>
                  )}
                  {it.status !== "pending" && it.decidedAt && (
                    <div className="text-[11px] text-muted-foreground mt-1">
                      {it.status === "approved" ? "Approved" : "Rejected"}{" "}
                      {formatTs(it.decidedAt)}
                    </div>
                  )}
                </div>
                <StatusPill status={it.status || "pending"} />
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
