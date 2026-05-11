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
      <Card>
        <div className="grid sm:grid-cols-4 gap-3 mb-4">
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
                  <div className="text-sm font-medium capitalize">
                    {humanize(l.action)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {users[l.performedBy]?.fullName || l.performedBy} · {l.role}{" "}
                    · {formatTs(l.createdAt)}
                  </div>
                  {l.metadata && Object.keys(l.metadata).length > 0 && (
                    <div className="text-xs text-muted-foreground mt-1">
                      {Object.entries(l.metadata).map(([k, v]) => (
                        <span key={k} className="mr-3">
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
