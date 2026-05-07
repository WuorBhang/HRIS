// Admin audit logs with filters + load more.
import { useEffect, useMemo, useState } from "react";
import {
  collection,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  startAfter,
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import { COLLECTIONS, ROLES } from "../../lib/constants";
import { formatTs } from "../../lib/utils";
import { AUDIT } from "../../lib/audit";
import { Select, Button, Card, PageHeader, SearchInput } from "../../lib/ui";
import Layout from "../../components/Layout";

const PAGE = 50;
const humanize = (s) => (s || "").replace(/_/g, " ").replace(/\./g, " · ");
const tone = (a) =>
  a?.includes("delete") || a?.includes("disabled") || a?.includes("rejected")
    ? "bg-red-500"
    : a?.includes("approved") || a?.includes("created") || a?.includes("login")
      ? "bg-green-500"
      : "bg-amber-500";

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [users, setUsers] = useState({});
  const [cursor, setCursor] = useState(null);
  const [more, setMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [fAction, setFAction] = useState("");
  const [fRole, setFRole] = useState("");
  const [fUser, setFUser] = useState("");
  // Wider sample for usage analytics (last N logs, capped).
  const [analyticsLogs, setAnalyticsLogs] = useState([]);

  // Resolve user names.
  useEffect(
    () =>
      onSnapshot(
        collection(db, COLLECTIONS.USERS),
        (s) =>
          setUsers(Object.fromEntries(s.docs.map((d) => [d.id, d.data()]))),
        () => {},
      ),
    [],
  );

  // Initial load.
  const load = async (after) => {
    let q = query(
      collection(db, COLLECTIONS.ACTIVITY_LOGS),
      orderBy("createdAt", "desc"),
      limit(PAGE),
    );
    if (after)
      q = query(
        collection(db, COLLECTIONS.ACTIVITY_LOGS),
        orderBy("createdAt", "desc"),
        startAfter(after),
        limit(PAGE),
      );
    const snap = await getDocs(q);
    const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    setLogs((cur) => (after ? [...cur, ...rows] : rows));
    setCursor(snap.docs[snap.docs.length - 1] || null);
    setMore(rows.length === PAGE);
    setLoading(false);
  };
  useEffect(() => {
    load(null).catch(() => setLoading(false));
  }, []);

  // Load a wider window for analytics (last 1000 logs).
  useEffect(() => {
    getDocs(
      query(
        collection(db, COLLECTIONS.ACTIVITY_LOGS),
        orderBy("createdAt", "desc"),
        limit(1000),
      ),
    )
      .then((s) =>
        setAnalyticsLogs(s.docs.map((d) => ({ id: d.id, ...d.data() }))),
      )
      .catch(() => {});
  }, []);

  // Compute usage analytics from the wider sample.
  const analytics = useMemo(() => {
    const now = Date.now();
    const DAY = 24 * 60 * 60 * 1000;
    const tsMs = (l) => {
      const t = l.createdAt;
      if (!t) return 0;
      if (typeof t.toMillis === "function") return t.toMillis();
      if (t.seconds) return t.seconds * 1000;
      return new Date(t).getTime() || 0;
    };
    const within = (ms, days) => now - ms <= days * DAY;
    const dau = new Set();
    const wau = new Set();
    const mau = new Set();
    const userCounts = new Map();
    const actionCounts = new Map();
    const pageCounts = new Map();
    const roleCounts = new Map();
    const sessions = []; // {uid, durSec}
    const dayBuckets = new Map(); // yyyy-mm-dd -> Set(uid)
    const monthBuckets = new Map(); // yyyy-mm -> Set(uid)
    for (const l of analyticsLogs) {
      const ms = tsMs(l);
      if (!ms) continue;
      const uid = l.performedBy;
      if (within(ms, 1)) dau.add(uid);
      if (within(ms, 7)) wau.add(uid);
      if (within(ms, 30)) mau.add(uid);
      if (uid) userCounts.set(uid, (userCounts.get(uid) || 0) + 1);
      if (l.action)
        actionCounts.set(l.action, (actionCounts.get(l.action) || 0) + 1);
      if (l.role) roleCounts.set(l.role, (roleCounts.get(l.role) || 0) + 1);
      if (l.action === AUDIT.PAGE_VIEW) {
        const p = l.metadata?.page || l.metadata?.path || "Unknown";
        pageCounts.set(p, (pageCounts.get(p) || 0) + 1);
      }
      if (l.action === AUDIT.SESSION_END) {
        const dur = Number(l.metadata?.durationSec || 0);
        if (dur > 0) sessions.push({ uid, durSec: dur });
      }
      const d = new Date(ms);
      const dayKey = d.toISOString().slice(0, 10);
      const monthKey = d.toISOString().slice(0, 7);
      if (within(ms, 30)) {
        if (!dayBuckets.has(dayKey)) dayBuckets.set(dayKey, new Set());
        dayBuckets.get(dayKey).add(uid);
      }
      if (within(ms, 365)) {
        if (!monthBuckets.has(monthKey)) monthBuckets.set(monthKey, new Set());
        monthBuckets.get(monthKey).add(uid);
      }
    }
    const top = (m, n = 5) =>
      [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);
    const totalSessionSec = sessions.reduce((a, s) => a + s.durSec, 0);
    const avgSessionSec = sessions.length
      ? Math.round(totalSessionSec / sessions.length)
      : 0;
    const longest = sessions.reduce(
      (m, s) => (s.durSec > (m?.durSec || 0) ? s : m),
      null,
    );
    // Per-user total active seconds (sum of session durations).
    const userActiveSec = new Map();
    for (const s of sessions) {
      if (!s.uid) continue;
      userActiveSec.set(s.uid, (userActiveSec.get(s.uid) || 0) + s.durSec);
    }
    const topActive = [...userActiveSec.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    const dailyTrend = [...dayBuckets.entries()]
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .slice(-14)
      .map(([day, set]) => ({ day, count: set.size }));
    const monthlyTrend = [...monthBuckets.entries()]
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .slice(-6)
      .map(([month, set]) => ({ month, count: set.size }));
    return {
      dau: dau.size,
      wau: wau.size,
      mau: mau.size,
      sample: analyticsLogs.length,
      sessions: sessions.length,
      avgSessionSec,
      longest,
      topUsers: top(userCounts),
      topActions: top(actionCounts),
      topPages: top(pageCounts),
      topActive,
      dailyTrend,
      monthlyTrend,
      roleCounts,
    };
  }, [analyticsLogs]);

  const fmtDur = (sec) => {
    if (!sec) return "0m";
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    if (h) return `${h}h ${m}m`;
    return `${m}m`;
  };
  const userName = (uid) => users[uid]?.fullName || uid?.slice(0, 8) || "—";

  const filtered = useMemo(
    () =>
      logs.filter((l) => {
        if (fAction && l.action !== fAction) return false;
        if (fRole && l.role !== fRole) return false;
        if (fUser && l.performedBy !== fUser) return false;
        if (search) {
          const q = search.toLowerCase();
          const blob =
            `${l.action} ${JSON.stringify(l.metadata || {})} ${users[l.performedBy]?.fullName || ""}`.toLowerCase();
          if (!blob.includes(q)) return false;
        }
        return true;
      }),
    [logs, search, fAction, fRole, fUser, users],
  );

  return (
    <Layout>
      <PageHeader title="Audit logs" subtitle="System-wide activity history." />

      {/* Usage analytics: how the app is being used. */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div className="bg-card rounded-lg shadow p-4">
          <div className="text-xs text-muted-foreground">Active today</div>
          <div className="text-2xl font-bold">{analytics.dau}</div>
          <div className="text-[11px] text-muted-foreground">unique users</div>
        </div>
        <div className="bg-card rounded-lg shadow p-4">
          <div className="text-xs text-muted-foreground">Active this week</div>
          <div className="text-2xl font-bold">{analytics.wau}</div>
          <div className="text-[11px] text-muted-foreground">last 7 days</div>
        </div>
        <div className="bg-card rounded-lg shadow p-4">
          <div className="text-xs text-muted-foreground">Active this month</div>
          <div className="text-2xl font-bold">{analytics.mau}</div>
          <div className="text-[11px] text-muted-foreground">last 30 days</div>
        </div>
        <div className="bg-card rounded-lg shadow p-4">
          <div className="text-xs text-muted-foreground">Avg session</div>
          <div className="text-2xl font-bold">
            {fmtDur(analytics.avgSessionSec)}
          </div>
          <div className="text-[11px] text-muted-foreground">
            {analytics.sessions} sessions
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="bg-card rounded-lg shadow p-4">
          <h3 className="font-semibold text-primary mb-2 text-sm">
            Most active users (by total time in app)
          </h3>
          {!analytics.topActive.length ? (
            <div className="text-xs text-muted-foreground py-4">
              No completed sessions yet.
            </div>
          ) : (
            <ul className="space-y-1.5">
              {analytics.topActive.map(([uid, sec]) => (
                <li
                  key={uid}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="truncate">
                    {userName(uid)}{" "}
                    <span className="text-xs text-muted-foreground">
                      · {users[uid]?.role || "—"}
                    </span>
                  </span>
                  <span className="text-xs font-medium">{fmtDur(sec)}</span>
                </li>
              ))}
            </ul>
          )}
          {analytics.longest && (
            <div className="text-[11px] text-muted-foreground mt-2">
              Longest single session: {fmtDur(analytics.longest.durSec)} ·{" "}
              {userName(analytics.longest.uid)}
            </div>
          )}
        </div>

        <div className="bg-card rounded-lg shadow p-4">
          <h3 className="font-semibold text-primary mb-2 text-sm">
            Most frequent users (by actions)
          </h3>
          {!analytics.topUsers.length ? (
            <div className="text-xs text-muted-foreground py-4">
              No activity yet.
            </div>
          ) : (
            <ul className="space-y-1.5">
              {analytics.topUsers.map(([uid, n]) => (
                <li
                  key={uid}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="truncate">
                    {userName(uid)}{" "}
                    <span className="text-xs text-muted-foreground">
                      · {users[uid]?.role || "—"}
                    </span>
                  </span>
                  <span className="text-xs font-medium">{n}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-card rounded-lg shadow p-4">
          <h3 className="font-semibold text-primary mb-2 text-sm">
            Most-used pages
          </h3>
          {!analytics.topPages.length ? (
            <div className="text-xs text-muted-foreground py-4">
              No page views yet.
            </div>
          ) : (
            <ul className="space-y-1.5">
              {analytics.topPages.map(([page, n]) => (
                <li
                  key={page}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="truncate">{page}</span>
                  <span className="text-xs font-medium">{n}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-card rounded-lg shadow p-4">
          <h3 className="font-semibold text-primary mb-2 text-sm">
            Most-used actions
          </h3>
          {!analytics.topActions.length ? (
            <div className="text-xs text-muted-foreground py-4">
              No activity yet.
            </div>
          ) : (
            <ul className="space-y-1.5">
              {analytics.topActions.map(([a, n]) => (
                <li
                  key={a}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="truncate capitalize">{humanize(a)}</span>
                  <span className="text-xs font-medium">{n}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-card rounded-lg shadow p-4 lg:col-span-2">
          <h3 className="font-semibold text-primary mb-2 text-sm">
            Daily active users (last 14 days)
          </h3>
          {!analytics.dailyTrend.length ? (
            <div className="text-xs text-muted-foreground py-4">No data.</div>
          ) : (
            <div className="flex items-end gap-1.5 h-24">
              {analytics.dailyTrend.map(({ day, count }) => {
                const max = Math.max(
                  1,
                  ...analytics.dailyTrend.map((d) => d.count),
                );
                const h = Math.max(4, Math.round((count / max) * 80));
                return (
                  <div
                    key={day}
                    className="flex-1 flex flex-col items-center gap-1 min-w-0"
                    title={`${day}: ${count}`}
                  >
                    <div
                      className="w-full bg-primary/70 rounded-sm"
                      style={{ height: `${h}px` }}
                    />
                    <div className="text-[10px] text-muted-foreground truncate w-full text-center">
                      {day.slice(5)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-card rounded-lg shadow p-4 lg:col-span-2">
          <h3 className="font-semibold text-primary mb-2 text-sm">
            Monthly active users (last 6 months)
          </h3>
          {!analytics.monthlyTrend.length ? (
            <div className="text-xs text-muted-foreground py-4">No data.</div>
          ) : (
            <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {analytics.monthlyTrend.map(({ month, count }) => (
                <li
                  key={month}
                  className="flex items-center justify-between bg-muted/30 rounded px-3 py-2 text-sm"
                >
                  <span>{month}</span>
                  <span className="font-semibold">{count}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-4">
          <div className="sm:col-span-2">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search by user, action or details…"
              className="sm:max-w-none"
            />
          </div>
          <Select value={fAction} onChange={setFAction}>
            <option value="">All actions</option>
            {Object.values(AUDIT).map((a) => (
              <option key={a} value={a}>
                {humanize(a)}
              </option>
            ))}
          </Select>
          <Select value={fRole} onChange={setFRole}>
            <option value="">All roles</option>
            {Object.values(ROLES).map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </Select>
        </div>
        {loading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Loading…
          </div>
        ) : !filtered.length ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No logs.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((l) => (
              <li key={l.id} className="py-3 flex gap-3">
                <div
                  className={`w-2 h-2 rounded-full mt-2 shrink-0 ${tone(l.action)}`}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium capitalize break-words">
                    {humanize(l.action)}
                  </div>
                  <div className="text-xs text-muted-foreground break-words">
                    {users[l.performedBy]?.fullName || l.performedBy} · {l.role}{" "}
                    · {formatTs(l.createdAt)}
                  </div>
                  {l.metadata && Object.keys(l.metadata).length > 0 && (
                    <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-3 gap-y-1">
                      {Object.entries(l.metadata).map(([k, v]) => (
                        <span key={k} className="break-words">
                          <b>{humanize(k)}:</b> {String(v)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
        {more && (
          <div className="text-center mt-4">
            <Button variant="outline" onClick={() => load(cursor)}>
              Load more
            </Button>
          </div>
        )}
      </Card>
    </Layout>
  );
}
