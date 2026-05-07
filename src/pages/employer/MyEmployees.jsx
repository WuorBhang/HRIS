// Employer's employee list with search.
import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../lib/firebase";
import { COLLECTIONS } from "../../lib/constants";
import { formatDate } from "../../lib/utils";
import { Card, PageHeader, SearchInput } from "../../lib/ui";
import Layout from "../../components/Layout";

export default function MyEmployees() {
  const { user } = useAuth();
  const [contracts, setContracts] = useState([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!user) return;
    return onSnapshot(
      query(
        collection(db, COLLECTIONS.CONTRACTS),
        where("employerId", "==", user.uid),
      ),
      (s) => setContracts(s.docs.map((d) => ({ id: d.id, ...d.data() }))),
      () => {},
    );
  }, [user]);

  // Dedup by employee, latest contract.
  const list = useMemo(() => {
    const map = {};
    for (const c of contracts) {
      const t = c.createdAt?.toMillis?.() || 0;
      if (
        !map[c.employeeId] ||
        t > (map[c.employeeId].createdAt?.toMillis?.() || 0)
      )
        map[c.employeeId] = c;
    }
    const arr = Object.values(map);
    if (!search) return arr;
    const q = search.toLowerCase();
    return arr.filter((c) =>
      `${c.employeeName} ${c.type} ${(c.roles || []).join(" ")}`
        .toLowerCase()
        .includes(q),
    );
  }, [contracts, search]);

  return (
    <Layout>
      <PageHeader
        title="My employees"
        subtitle="Your linked employees and contracts."
      />
      <Card>
        <div className="mb-4">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search employees by name, contract type or role…"
          />
        </div>
        {!list.length ? (
          <div className="text-center text-sm text-muted-foreground py-10">
            No employees yet.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {list.map((c) => (
              <li key={c.id}>
                <Link href={`/employer/employees/${c.id}`}>
                  <div className="py-3 flex items-center justify-between gap-3 cursor-pointer hover:bg-muted/20 px-2 rounded">
                    <div>
                      <div className="font-medium">{c.employeeName}</div>
                      <div className="text-xs text-muted-foreground">
                        {c.type} · since {formatDate(c.startDate)}
                      </div>
                    </div>
                    <span className="text-primary text-sm">View →</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </Layout>
  );
}
