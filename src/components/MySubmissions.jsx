// Live "My submissions" list shown to the employee under every submission
// form (Leave / Overtime / Holiday work). Subscribes to the relevant
// Firestore collection scoped to the current user and renders each entry
// with its current status badge (Pending / Approved / Rejected) and the
// employer's decision timestamp once a decision exists.

import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { CheckCircle2, XCircle, Clock } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { db } from "../lib/firebase";
import { COLLECTIONS } from "../lib/constants";
import { formatDate } from "../lib/utils";

/**
 * @param {object} props
 * @param {"leave"|"overtime"|"holiday"} props.mode
 */
export default function MySubmissions({ mode }) {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const collName =
      mode === "leave"
        ? COLLECTIONS.LEAVE_REQUESTS
        : COLLECTIONS.OVERTIME_RECORDS;
    const q = query(
      collection(db, collName),
      where("employeeId", "==", user.uid),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      () => setLoading(false),
    );
    return () => unsub();
  }, [user, mode]);

  // For overtime collection we host both regular overtime AND holiday work;
  // filter by isHoliday so each form only shows its own type.
  const filtered = useMemo(() => {
    if (mode === "overtime") return items.filter((i) => i.isHoliday !== true);
    if (mode === "holiday") return items.filter((i) => i.isHoliday === true);
    return items;
  }, [items, mode]);

  const sorted = useMemo(
    () =>
      [...filtered].sort(
        (a, b) =>
          (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0),
      ),
    [filtered],
  );

  const counts = useMemo(() => {
    const c = { pending: 0, approved: 0, rejected: 0 };
    for (const i of filtered) if (c[i.status] !== undefined) c[i.status]++;
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
          <Pill tone="amber">Pending {counts.pending}</Pill>
          <Pill tone="green">Approved {counts.approved}</Pill>
          <Pill tone="red">Rejected {counts.rejected}</Pill>
        </div>
      </div>

      {loading ? (
        <div className="py-8 text-center text-sm text-muted-foreground">
          Loading…
        </div>
      ) : sorted.length === 0 ? (
        <div className="py-8 text-center text-sm text-muted-foreground">
          No submissions yet. Use the form above to send your first one.
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {sorted.map((it) => (
            <Row key={it.id} item={it} mode={mode} />
          ))}
        </ul>
      )}
    </section>
  );
}

function Row({ item, mode }) {
  const status = item.status || "pending";

  let primary = "";
  let secondary = "";
  if (mode === "leave") {
    primary = `${item.type || "Leave"} · ${item.days || 0} day${item.days === 1 ? "" : "s"}`;
    secondary = `${formatDate(item.startDate)} → ${formatDate(item.endDate)}`;
  } else {
    const label = mode === "holiday" ? "Holiday work" : "Overtime";
    primary = `${label} · ${item.hours}h`;
    secondary = item.holidayName
      ? `${formatDate(item.date)} — ${item.holidayName}`
      : formatDate(item.date);
  }

  return (
    <li className="py-3 flex items-start gap-3">
      <StatusIcon status={status} />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-foreground">{primary}</div>
        <div className="text-xs text-muted-foreground">{secondary}</div>
        {item.notes && (
          <div className="text-xs text-muted-foreground mt-1 italic line-clamp-2">
            “{item.notes}”
          </div>
        )}
        {status !== "pending" && item.decidedAt && (
          <div className="text-[11px] text-muted-foreground mt-1">
            {status === "approved" ? "Approved" : "Rejected"} on{" "}
            {fmtTs(item.decidedAt)}
          </div>
        )}
      </div>
      <StatusBadge status={status} />
    </li>
  );
}

function StatusIcon({ status }) {
  if (status === "approved")
    return <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />;
  if (status === "rejected")
    return <XCircle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />;
  return <Clock className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />;
}

function StatusBadge({ status }) {
  const cls =
    status === "approved"
      ? "bg-green-100 text-green-700"
      : status === "rejected"
        ? "bg-red-100 text-red-700"
        : "bg-amber-100 text-amber-700";
  return (
    <span
      className={`text-[11px] px-2 py-1 rounded-full font-medium capitalize shrink-0 ${cls}`}
    >
      {status}
    </span>
  );
}

function Pill({ tone, children }) {
  const cls =
    tone === "green"
      ? "bg-green-100 text-green-700"
      : tone === "red"
        ? "bg-red-100 text-red-700"
        : "bg-amber-100 text-amber-700";
  return (
    <span className={`px-2 py-0.5 rounded-full font-medium ${cls}`}>
      {children}
    </span>
  );
}

function fmtTs(ts) {
  const ms = ts?.toMillis?.();
  if (!ms) return "—";
  return new Date(ms).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
