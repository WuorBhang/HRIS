// User's own audit feed with search + load more.
import { useEffect, useMemo, useState } from "react";
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  where,
} from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { db } from "../lib/firebase";
import { COLLECTIONS, ROLES } from "../lib/constants";
import { formatTs } from "../lib/utils";
import { Card, PageHeader, Button, SearchInput } from "../lib/ui";
import Layout from "../components/Layout";

const PAGE = 25;
const humanize = (s) => (s || "").replace(/_/g, " ").replace(/\./g, " · ");

export default function MyActivity() {
  const { user, profile } = useAuth();
  const [items, setItems] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [more, setMore] = useState(false);
  const [search, setSearch] = useState("");

  // Role-aware placeholder so it speaks to who's reading it.
  const searchPlaceholder =
    profile?.role === ROLES.ADMIN
      ? "Search your admin actions, users, contracts…"
      : profile?.role === ROLES.EMPLOYER
        ? "Search approvals, employees, payslips…"
        : profile?.role === ROLES.EMPLOYEE
          ? "Search your leave, overtime, holiday entries…"
          : "Search your activity…";

  // Load page (initial or next).
  const load = async (after) => {
    if (!user) return;
    let q = query(
      collection(db, COLLECTIONS.ACTIVITY_LOGS),
      where("performedBy", "==", user.uid),
      orderBy("createdAt", "desc"),
      limit(PAGE),
    );
    if (after)
      q = query(
        collection(db, COLLECTIONS.ACTIVITY_LOGS),
        where("performedBy", "==", user.uid),
        orderBy("createdAt", "desc"),
        startAfter(after),
        limit(PAGE),
      );
    const snap = await getDocs(q);
    const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    setItems((cur) => (after ? [...cur, ...rows] : rows));
    setCursor(snap.docs[snap.docs.length - 1] || null);
    setMore(rows.length === PAGE);
    setLoading(false);
  };

  useEffect(() => {
    load(null).catch(() => setLoading(false));
  }, [user]); // eslint-disable-line

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) =>
      `${i.action} ${JSON.stringify(i.metadata || {})}`
        .toLowerCase()
        .includes(q),
    );
  }, [items, search]);

  return (
    <Layout>
      <PageHeader
        title="My activity"
        subtitle="Your recent actions across the system."
      />
      <Card>
        <div className="mb-4">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder={searchPlaceholder}
          />
        </div>
        {loading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Loading…
          </div>
        ) : !filtered.length ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No activity yet.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((i) => (
              <li key={i.id} className="py-3">
                <div className="text-sm font-medium capitalize">
                  {humanize(i.action)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatTs(i.createdAt)}
                </div>
                {i.metadata && Object.keys(i.metadata).length > 0 && (
                  <div className="text-xs text-muted-foreground mt-1">
                    {Object.entries(i.metadata).map(([k, v]) => (
                      <span key={k} className="mr-3">
                        <b>{humanize(k)}:</b> {String(v)}
                      </span>
                    ))}
                  </div>
                )}
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
