import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { Mail, Phone, Briefcase, Calendar, ChevronRight } from "lucide-react";
import Layout from "../../components/Layout";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../lib/firebase";
import { COLLECTIONS } from "../../lib/constants";
import { formatDate } from "../../lib/utils";

export default function MyEmployees() {
  const { user } = useAuth();
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(
      query(
        collection(db, COLLECTIONS.CONTRACTS),
        where("employerId", "==", user.uid),
      ),
      (snap) => {
        setContracts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      () => setLoading(false),
    );
    return () => unsub();
  }, [user]);

  // One employee may appear under multiple contracts; collapse to a unique
  // list, keeping the most recent contract row as the source of truth.
  const employees = useMemo(() => {
    const byId = new Map();
    const sorted = [...contracts].sort((a, b) => {
      const at = a.createdAt?.toMillis?.() || 0;
      const bt = b.createdAt?.toMillis?.() || 0;
      return bt - at;
    });
    for (const c of sorted) {
      if (!c.employeeId) continue;
      if (!byId.has(c.employeeId)) byId.set(c.employeeId, c);
    }
    return Array.from(byId.values());
  }, [contracts]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter((e) =>
      [e.employeeName, e.employeeEmail, e.employeePhone, e.position]
        .filter(Boolean)
        .some((v) => v.toLowerCase().includes(q)),
    );
  }, [employees, search]);

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-primary">
          My Employees
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Everyone currently linked to you through an active contract.
        </p>
      </div>

      <div className="bg-card rounded-lg shadow p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div className="text-sm text-muted-foreground">
            {loading
              ? "Loading…"
              : `${employees.length} employee${employees.length === 1 ? "" : "s"} linked`}
          </div>
          <input
            type="search"
            placeholder="Search by name, email, phone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-72 px-3 py-2 rounded-md border border-border bg-card text-sm outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {loading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            Loading employees…
          </div>
        ) : employees.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm text-muted-foreground">
              No employees linked yet. Contact SafiHub admin to add a contract
              for you.
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            No employees match “{search}”.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((e) => (
              <li key={e.employeeId}>
                <Link href={`/employer/employees/${e.id}`}>
                  <div className="py-4 flex items-start gap-4 cursor-pointer hover:bg-muted/30 -mx-2 px-2 rounded transition group">
                    <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold shrink-0">
                      {(e.employeeName || e.employeeEmail || "?")
                        .charAt(0)
                        .toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-foreground truncate">
                        {e.employeeName ||
                          e.employeeEmail ||
                          "Unnamed employee"}
                      </div>
                      <div className="mt-1 grid sm:grid-cols-2 gap-x-6 gap-y-1 text-xs text-muted-foreground">
                        {e.position && (
                          <Detail icon={Briefcase} text={e.position} />
                        )}
                        {e.startDate && (
                          <Detail
                            icon={Calendar}
                            text={`Since ${formatDate(e.startDate)}`}
                          />
                        )}
                        {e.employeeEmail && (
                          <Detail icon={Mail} text={e.employeeEmail} />
                        )}
                        {e.employeePhone && (
                          <Detail icon={Phone} text={e.employeePhone} />
                        )}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary self-center shrink-0" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Layout>
  );
}

function Detail({ icon: Icon, text }) {
  return (
    <div className="flex items-center gap-1.5 min-w-0">
      <Icon className="w-3.5 h-3.5 shrink-0" />
      <span className="truncate">{text}</span>
    </div>
  );
}
