import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import {
  Users as UsersIcon,
  Hourglass,
  ClipboardList,
  Eye,
  CheckSquare,
  BarChart3,
  FileText,
  ChevronRight,
} from "lucide-react";
import Layout from "../../components/Layout";
import UpcomingHolidays from "../../components/UpcomingHolidays";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../lib/firebase";
import { COLLECTIONS } from "../../lib/constants";

export default function EmployerDashboard() {
  const { user, profile } = useAuth();
  const [contracts, setContracts] = useState([]);
  const [pendingLeave, setPendingLeave] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const unsubContracts = onSnapshot(
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

    const unsubLeave = onSnapshot(
      query(
        collection(db, COLLECTIONS.LEAVE_REQUESTS),
        where("employerId", "==", user.uid),
        where("status", "==", "pending"),
      ),
      (s) => setPendingLeave(s.size),
      () => setPendingLeave(0),
    );

    return () => {
      unsubContracts();
      unsubLeave();
    };
  }, [user]);

  // Collapse multi-contract employees down to a single row, using the most
  // recent contract as the source of truth (employee name, position, etc.).
  const linkedEmployees = useMemo(() => {
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

  const activeEmployees = linkedEmployees.length;

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-primary">
          Employer Dashboard
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Welcome back, {profile?.fullName || profile?.email}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
        <Stat
          label="Active Employees"
          value={activeEmployees}
          icon={UsersIcon}
          tone="amber"
        />
        <Stat
          label="Pending Leave"
          value={pendingLeave}
          icon={Hourglass}
          tone="amber"
        />
        <Stat
          label="Active Contracts"
          value={contracts.length}
          icon={ClipboardList}
          tone="red"
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-4 sm:gap-6 mb-6">
        <section className="bg-card rounded-lg shadow p-5 sm:p-6">
          <h2 className="text-base sm:text-lg font-semibold text-primary mb-4">
            Quick Actions
          </h2>
          <ul className="divide-y divide-border">
            <ActionRow
              to="/employer/employees"
              label="View Employees"
              icon={Eye}
              tone="amber"
            />
            <ActionRow
              to="/employer/leave-requests"
              label="Approve Leave Requests"
              icon={CheckSquare}
              tone="green"
            />
            <ActionRow
              to="/employer/timesheets"
              label="Review Timesheets"
              icon={BarChart3}
              tone="purple"
            />
            <ActionRow
              to="/employer/documents"
              label="View Documents"
              icon={FileText}
              tone="purple"
            />
          </ul>
        </section>

        <section className="bg-card rounded-lg shadow p-5 sm:p-6">
          <h2 className="text-base sm:text-lg font-semibold text-primary mb-4">
            My Employees
          </h2>
          {loading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Loading…
            </div>
          ) : linkedEmployees.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No employees linked yet. Contact SafiHub admin.
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {linkedEmployees.slice(0, 5).map((c) => {
                const display = c.employeeName || c.employeeEmail || "Employee";
                return (
                  <li key={c.employeeId}>
                    <Link href={`/employer/employees/${c.id}`}>
                      <span className="flex items-center gap-3 py-3 -mx-2 px-2 rounded cursor-pointer hover:bg-muted/30 transition">
                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm shrink-0">
                          {display.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-foreground truncate">
                            {display}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {c.position || c.employeeEmail || "—"}
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </span>
                    </Link>
                  </li>
                );
              })}
              {linkedEmployees.length > 5 && (
                <li className="pt-3">
                  <Link href="/employer/employees">
                    <span className="text-sm text-primary hover:underline cursor-pointer">
                      View all {linkedEmployees.length} employees →
                    </span>
                  </Link>
                </li>
              )}
            </ul>
          )}
        </section>
      </div>

      <UpcomingHolidays />
    </Layout>
  );
}

const TONES = {
  purple: { bg: "bg-purple-100", fg: "text-purple-600" },
  green: { bg: "bg-green-100", fg: "text-green-600" },
  amber: { bg: "bg-amber-100", fg: "text-amber-600" },
  red: { bg: "bg-red-100", fg: "text-red-600" },
};

function Stat({ label, value, icon: Icon, tone = "amber" }) {
  const t = TONES[tone] || TONES.amber;
  return (
    <div className="bg-card rounded-lg shadow p-4 sm:p-5 flex items-center gap-3 sm:gap-4">
      <div
        className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center shrink-0 ${t.bg}`}
      >
        <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${t.fg}`} />
      </div>
      <div className="min-w-0">
        <div className="text-2xl sm:text-3xl font-bold text-primary leading-none">
          {value}
        </div>
        <div className="text-xs sm:text-sm text-muted-foreground mt-1 truncate">
          {label}
        </div>
      </div>
    </div>
  );
}

function ActionRow({ to, label, icon: Icon, tone = "amber" }) {
  const t = TONES[tone] || TONES.amber;
  return (
    <li>
      <Link href={to}>
        <span className="flex items-center gap-3 py-3 cursor-pointer hover:bg-muted/30 -mx-2 px-2 rounded transition group">
          <span
            className={`w-9 h-9 rounded-md flex items-center justify-center shrink-0 ${t.bg}`}
          >
            <Icon className={`w-4 h-4 ${t.fg}`} />
          </span>
          <span className="flex-1 text-sm font-medium text-foreground truncate">
            {label}
          </span>
          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition" />
        </span>
      </Link>
    </li>
  );
}
