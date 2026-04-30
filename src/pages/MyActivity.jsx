// Per-user "My Activity" view.
//
// Shows the entries from `activity_logs` where `performedBy == auth.uid`.
// Firestore rules permit each signed-in user to read their own entries.

import { useEffect, useMemo, useState } from "react";
import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { ScrollText, Search } from "lucide-react";
import Layout from "../components/Layout";
import { db } from "../lib/firebase";
import { useAuth } from "../context/AuthContext";
import { COLLECTIONS } from "../lib/constants";

const PAGE_SIZE = 100;

export default function MyActivity() {
  const { user, profile } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(PAGE_SIZE);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, COLLECTIONS.ACTIVITY_LOGS),
      where("performedBy", "==", user.uid),
      orderBy("createdAt", "desc"),
      limit(pageSize),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setLogs(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      () => setLoading(false),
    );
    return () => unsub();
  }, [user, pageSize]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return logs;
    return logs.filter((l) => {
      const metaText = readableMetaEntries(l.metadata)
        .map(([k, v]) => `${humanizeKey(k)} ${humanizeValue(v)}`)
        .join(" ");
      return [humanizeAction(l.action), l.role, metaText]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [logs, search]);

  const roleLabel = profile?.role
    ? profile.role.charAt(0).toUpperCase() + profile.role.slice(1)
    : "";

  return (
    <Layout>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-primary flex items-center gap-2">
            <ScrollText className="w-6 h-6" /> My Activity
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            A history of everything you have done on SafiHub
            {roleLabel ? ` as ${roleLabel}` : ""}.
          </p>
        </div>
        <div className="text-xs text-muted-foreground">
          {filtered.length} of {logs.length} entries
        </div>
      </div>

      <div className="bg-card rounded-lg shadow p-4 sm:p-5 mb-4">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search action or details"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-md border border-border bg-card outline-none focus:ring-2 focus:ring-primary text-sm"
          />
        </div>
      </div>

      <div className="bg-card rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-sm text-muted-foreground">
            Loading your activity…
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">
            No activity recorded yet.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((l) => {
              const tone = actionTone(l.action);
              return (
                <li
                  key={l.id}
                  className="p-4 sm:p-5 hover:bg-muted/20 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`mt-1 inline-flex w-2 h-2 rounded-full flex-shrink-0 ${tone.dot}`}
                      aria-hidden
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-foreground">
                            {humanizeAction(l.action)}
                          </span>
                          <span
                            className={`text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full ${tone.badge}`}
                          >
                            {tone.label}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {fmtTs(l.createdAt)}
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground mb-2">
                        Role:{" "}
                        <span className="px-2 py-0.5 rounded-full bg-muted/50">
                          {l.role || "—"}
                        </span>
                      </div>
                      {hasReadableMeta(l.metadata) && (
                        <dl className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-xs bg-muted/30 rounded-md p-3">
                          {readableMetaEntries(l.metadata).map(([k, v]) => (
                            <div
                              key={k}
                              className="flex items-baseline gap-2 min-w-0"
                            >
                              <dt className="text-muted-foreground whitespace-nowrap">
                                {humanizeKey(k)}:
                              </dt>
                              <dd className="text-foreground font-medium truncate">
                                {humanizeValue(v)}
                              </dd>
                            </div>
                          ))}
                        </dl>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {!loading && logs.length >= pageSize && (
          <div className="p-3 text-center border-t border-border">
            <button
              onClick={() => setPageSize((n) => n + PAGE_SIZE)}
              className="text-sm text-primary hover:underline"
            >
              Load more
            </button>
          </div>
        )}
      </div>
    </Layout>
  );
}

function fmtTs(ts) {
  const ms = ts?.toMillis?.();
  if (!ms) return "—";
  const d = new Date(ms);
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Internal id fields are useless to the user — strip them from the UI.
const HIDDEN_META_KEYS = new Set([
  "employerId",
  "employeeId",
  "contractId",
  "leaveRequestId",
  "overtimeRecordId",
  "documentId",
  "uid",
  "id",
  "bootstrap",
]);

function readableMetaEntries(m) {
  if (!m || typeof m !== "object") return [];
  return Object.entries(m).filter(
    ([k, v]) =>
      !HIDDEN_META_KEYS.has(k) &&
      v !== null &&
      v !== undefined &&
      v !== "" &&
      !(Array.isArray(v) && v.length === 0),
  );
}

function hasReadableMeta(m) {
  return readableMetaEntries(m).length > 0;
}

function humanizeKey(key) {
  return key
    .replace(/[_.]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

function humanizeValue(value) {
  if (value === true) return "Yes";
  if (value === false) return "No";
  if (Array.isArray(value)) return value.map(humanizeValue).join(", ");
  if (value && typeof value === "object") {
    return Object.entries(value)
      .map(([k, v]) => `${humanizeKey(k)}: ${humanizeValue(v)}`)
      .join(" · ");
  }
  return String(value);
}

function humanizeAction(action) {
  if (!action) return "—";
  return action
    .replace(/[_.]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// Map an action to a coloured tag & dot. Approve = green, reject = red,
// submit/create = blue, delete/disable = orange, login/logout = slate.
function actionTone(action = "") {
  const a = action.toLowerCase();
  if (
    a.endsWith(".approved") ||
    a.endsWith(".activated") ||
    a.endsWith(".reenabled")
  ) {
    return {
      label: "Approved",
      dot: "bg-green-500",
      badge: "bg-green-100 text-green-700",
    };
  }
  if (a.endsWith(".rejected") || a.endsWith(".cancelled")) {
    return {
      label: "Rejected",
      dot: "bg-red-500",
      badge: "bg-red-100 text-red-700",
    };
  }
  if (a.endsWith(".submitted") || a.endsWith(".requested")) {
    return {
      label: "Submitted",
      dot: "bg-blue-500",
      badge: "bg-blue-100 text-blue-700",
    };
  }
  if (a.endsWith(".created") || a.endsWith(".uploaded")) {
    return {
      label: "Created",
      dot: "bg-indigo-500",
      badge: "bg-indigo-100 text-indigo-700",
    };
  }
  if (a.endsWith(".updated")) {
    return {
      label: "Updated",
      dot: "bg-amber-500",
      badge: "bg-amber-100 text-amber-700",
    };
  }
  if (
    a.endsWith(".deleted") ||
    a.endsWith(".disabled") ||
    a.endsWith(".deactivated")
  ) {
    return {
      label: "Removed",
      dot: "bg-orange-500",
      badge: "bg-orange-100 text-orange-700",
    };
  }
  if (a === "user.login") {
    return {
      label: "Login",
      dot: "bg-slate-400",
      badge: "bg-slate-100 text-slate-700",
    };
  }
  if (a === "user.logout") {
    return {
      label: "Logout",
      dot: "bg-slate-400",
      badge: "bg-slate-100 text-slate-700",
    };
  }
  return {
    label: "Event",
    dot: "bg-primary",
    badge: "bg-muted text-foreground",
  };
}
