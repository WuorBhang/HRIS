// Admin "Audit Logs" viewer.
//
// Reads from `activity_logs` (append-only, see firestore.rules). Lets admin
// filter by action, role, target user, and free-text search across
// performedBy / metadata. Most-recent first. Pagination is "load more"
// style — we keep it simple and load 100 at a time.

import { useEffect, useMemo, useState } from "react";
import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";
import { ScrollText, Search } from "lucide-react";
import Layout from "../../components/Layout";
import { db } from "../../lib/firebase";
import { AUDIT_ACTIONS } from "../../lib/audit";
import { COLLECTIONS, ROLES } from "../../lib/constants";

const ACTION_OPTIONS = Object.values(AUDIT_ACTIONS).sort();
const ROLE_OPTIONS = Object.values(ROLES);
const PAGE_SIZE = 100;

export default function AdminAuditLogs() {
  const [logs, setLogs] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);

  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [userFilter, setUserFilter] = useState("");

  useEffect(() => {
    const q = query(
      collection(db, COLLECTIONS.ACTIVITY_LOGS),
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
  }, [pageSize]);

  // Load users so we can render names alongside uids.
  useEffect(() => {
    const unsub = onSnapshot(collection(db, COLLECTIONS.USERS), (snap) =>
      setUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    );
    return () => unsub();
  }, []);

  const userById = useMemo(
    () => Object.fromEntries(users.map((u) => [u.id, u])),
    [users],
  );

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return logs.filter((l) => {
      if (actionFilter && l.action !== actionFilter) return false;
      if (roleFilter && l.role !== roleFilter) return false;
      if (userFilter && l.performedBy !== userFilter) return false;
      if (!needle) return true;
      const u = userById[l.performedBy];
      const blob = [
        l.action,
        l.performedBy,
        l.role,
        u?.fullName,
        u?.email,
        JSON.stringify(l.metadata || {}),
      ]
        .join(" ")
        .toLowerCase();
      return blob.includes(needle);
    });
  }, [logs, search, actionFilter, roleFilter, userFilter, userById]);

  // Build a sorted list of distinct users that appear in the loaded logs.
  const userOptions = useMemo(() => {
    const seen = new Set();
    const opts = [];
    for (const l of logs) {
      if (!l.performedBy || seen.has(l.performedBy)) continue;
      seen.add(l.performedBy);
      const u = userById[l.performedBy];
      opts.push({
        uid: l.performedBy,
        label: u?.fullName || u?.email || l.performedBy,
      });
    }
    return opts.sort((a, b) => a.label.localeCompare(b.label));
  }, [logs, userById]);

  return (
    <Layout>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-primary flex items-center gap-2">
            <ScrollText className="w-6 h-6" /> Audit Logs
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Every important action taken on the system.
          </p>
        </div>
        <div className="text-xs text-muted-foreground">
          Showing {filtered.length} of {logs.length} loaded entries
        </div>
      </div>

      <div className="bg-card rounded-lg shadow p-4 sm:p-5 mb-4 grid sm:grid-cols-4 gap-3">
        <div className="relative sm:col-span-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search action / user / metadata"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-md border border-border bg-card outline-none focus:ring-2 focus:ring-primary text-sm"
          />
        </div>
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="px-3 py-2 rounded-md border border-border bg-card outline-none focus:ring-2 focus:ring-primary text-sm"
        >
          <option value="">All actions</option>
          {ACTION_OPTIONS.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-3 py-2 rounded-md border border-border bg-card outline-none focus:ring-2 focus:ring-primary text-sm"
        >
          <option value="">All roles</option>
          {ROLE_OPTIONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <select
          value={userFilter}
          onChange={(e) => setUserFilter(e.target.value)}
          className="px-3 py-2 rounded-md border border-border bg-card outline-none focus:ring-2 focus:ring-primary text-sm"
        >
          <option value="">All users</option>
          {userOptions.map((o) => (
            <option key={o.uid} value={o.uid}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-card rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-sm text-muted-foreground">
            Loading audit logs…
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">
            No matching audit entries.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">When</th>
                  <th className="text-left px-4 py-3 font-medium">Action</th>
                  <th className="text-left px-4 py-3 font-medium">Role</th>
                  <th className="text-left px-4 py-3 font-medium">By</th>
                  <th className="text-left px-4 py-3 font-medium">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((l) => {
                  const u = userById[l.performedBy];
                  const tone = actionTone(l.action);
                  return (
                    <tr key={l.id} className="align-top hover:bg-muted/20">
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-muted-foreground">
                        {fmtTs(l.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex w-2 h-2 rounded-full flex-shrink-0 ${tone.dot}`}
                            aria-hidden
                          />
                          <span className="font-medium text-foreground">
                            {humanizeAction(l.action)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <span className="px-2 py-0.5 rounded-full bg-muted/50 text-muted-foreground">
                          {l.role || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs max-w-[220px]">
                        <div className="font-medium text-foreground truncate">
                          {u?.fullName || u?.email || "Unknown"}
                        </div>
                        <div className="text-muted-foreground font-mono break-all text-[10px]">
                          {l.performedBy || "—"}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground max-w-[420px]">
                        <div className="whitespace-pre-wrap break-words leading-snug">
                          {fmtMeta(l.metadata)}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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

function fmtMeta(m) {
  if (!m || typeof m !== "object") return "—";
  const entries = Object.entries(m).filter(
    ([, v]) => v !== null && v !== undefined && v !== "",
  );
  if (entries.length === 0) return "—";

  // Hide internal id fields entirely (they're not useful to humans here).
  const HIDDEN_KEYS = new Set([
    "employerId",
    "employeeId",
    "contractId",
    "leaveRequestId",
    "overtimeRecordId",
    "documentId",
    "uid",
    "id",
  ]);

  const lines = [];
  for (const [key, value] of entries) {
    if (HIDDEN_KEYS.has(key)) continue;
    lines.push(`${humanizeKey(key)}: ${humanizeValue(value)}`);
  }
  return lines.length ? lines.join("\n") : "—";
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
      .map(([k, v]) => `${humanizeKey(k)} ${humanizeValue(v)}`)
      .join(", ");
  }
  return String(value);
}

function humanizeAction(action) {
  if (!action) return "—";
  return action
    .replace(/[_.]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function actionTone(action = "") {
  const a = action.toLowerCase();
  if (
    a.endsWith(".approved") ||
    a.endsWith(".activated") ||
    a.endsWith(".reenabled")
  ) {
    return { dot: "bg-green-500" };
  }
  if (a.endsWith(".rejected") || a.endsWith(".cancelled")) {
    return { dot: "bg-red-500" };
  }
  if (a.endsWith(".submitted") || a.endsWith(".requested")) {
    return { dot: "bg-blue-500" };
  }
  if (a.endsWith(".created") || a.endsWith(".uploaded")) {
    return { dot: "bg-indigo-500" };
  }
  if (a.endsWith(".updated")) {
    return { dot: "bg-amber-500" };
  }
  if (
    a.endsWith(".deleted") ||
    a.endsWith(".disabled") ||
    a.endsWith(".deactivated")
  ) {
    return { dot: "bg-orange-500" };
  }
  if (a === "user.login" || a === "user.logout") {
    return { dot: "bg-slate-400" };
  }
  return { dot: "bg-primary" };
}
