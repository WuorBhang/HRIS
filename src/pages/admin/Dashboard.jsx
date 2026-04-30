import { useEffect, useState } from "react";
import { Link } from "wouter";
import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import {
  Users as UsersIcon,
  FileText,
  Hourglass,
  FolderClosed,
  Building2,
  UserPlus,
  ClipboardList,
  Upload,
  ScrollText,
  ChevronRight,
} from "lucide-react";
import Layout from "../../components/Layout";
import UpcomingHolidays from "../../components/UpcomingHolidays";
import { db } from "../../lib/firebase";
import { COLLECTIONS } from "../../lib/constants";

export default function AdminDashboard() {
  const [counts, setCounts] = useState({
    users: 0,
    contracts: 0,
    pendingLeave: 0,
    documents: 0,
  });
  const [recent, setRecent] = useState([]);
  const [recentLoading, setRecentLoading] = useState(true);

  useEffect(() => {
    const unsubUsers = onSnapshot(collection(db, COLLECTIONS.USERS), (s) =>
      setCounts((c) => ({ ...c, users: s.size })),
    );
    const unsubContracts = onSnapshot(
      collection(db, COLLECTIONS.CONTRACTS),
      (s) => setCounts((c) => ({ ...c, contracts: s.size })),
    );
    const unsubLeave = onSnapshot(
      query(
        collection(db, COLLECTIONS.LEAVE_REQUESTS),
        where("status", "==", "pending"),
      ),
      (s) => setCounts((c) => ({ ...c, pendingLeave: s.size })),
      () => setCounts((c) => ({ ...c, pendingLeave: 0 })),
    );
    const unsubDocs = onSnapshot(
      collection(db, COLLECTIONS.DOCUMENTS),
      (s) => setCounts((c) => ({ ...c, documents: s.size })),
      () => setCounts((c) => ({ ...c, documents: 0 })),
    );
    const unsubAudit = onSnapshot(
      query(
        collection(db, COLLECTIONS.ACTIVITY_LOGS),
        orderBy("createdAt", "desc"),
        limit(8),
      ),
      (s) => {
        setRecent(s.docs.map((d) => ({ id: d.id, ...d.data() })));
        setRecentLoading(false);
      },
      () => setRecentLoading(false),
    );
    return () => {
      unsubUsers();
      unsubContracts();
      unsubLeave();
      unsubDocs();
      unsubAudit();
    };
  }, []);

  return (
    <Layout>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-primary">
          Admin Dashboard
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          SafiHub system overview
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <Stat
          label="Users"
          value={counts.users}
          icon={UsersIcon}
          tone="purple"
        />
        <Stat
          label="Contracts"
          value={counts.contracts}
          icon={FileText}
          tone="green"
        />
        <Stat
          label="Pending Leave"
          value={counts.pendingLeave}
          icon={Hourglass}
          tone="amber"
        />
        <Stat
          label="Documents"
          value={counts.documents}
          icon={FolderClosed}
          tone="gold"
        />
      </div>

      {/* Quick actions + Recent activity */}
      <div className="grid lg:grid-cols-2 gap-4 sm:gap-6 mb-6">
        <section className="bg-card rounded-lg shadow p-5 sm:p-6">
          <h2 className="text-base sm:text-lg font-semibold text-primary mb-4">
            Quick Actions
          </h2>
          <ul className="divide-y divide-border">
            <ActionRow
              to="/admin/users?create=employer"
              label="Create Employer Account"
              icon={Building2}
              tone="blue"
            />
            <ActionRow
              to="/admin/users?create=employee"
              label="Create Employee Account"
              icon={UserPlus}
              tone="amber"
            />
            <ActionRow
              to="/admin/contracts"
              label="Manage Contracts"
              icon={ClipboardList}
              tone="green"
            />
            <ActionRow
              to="/admin/documents"
              label="Upload Documents"
              icon={Upload}
              tone="purple"
            />
            <ActionRow
              to="/admin/audit-logs"
              label="View Audit Logs"
              icon={ScrollText}
              tone="slate"
            />
          </ul>
        </section>

        <section className="bg-card rounded-lg shadow p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base sm:text-lg font-semibold text-primary">
              Recent Activity
            </h2>
            <Link href="/admin/audit-logs">
              <span className="text-xs text-primary hover:underline cursor-pointer">
                View all →
              </span>
            </Link>
          </div>
          {recentLoading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Loading…
            </div>
          ) : recent.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
              No activity logged yet
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {recent.map((l) => (
                <li key={l.id} className="py-2.5 flex items-start gap-3">
                  <span className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-foreground truncate">
                      {l.action}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {l.role || "—"} · {fmtRelative(l.createdAt)}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Preserved Upcoming holidays widget */}
      <UpcomingHolidays />
    </Layout>
  );
}

function fmtRelative(ts) {
  const ms = ts?.toMillis?.();
  if (!ms) return "just now";
  const diff = Date.now() - ms;
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return new Date(ms).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
  });
}

const TONES = {
  purple: { bg: "bg-purple-100", fg: "text-purple-600" },
  green: { bg: "bg-green-100", fg: "text-green-600" },
  amber: { bg: "bg-amber-100", fg: "text-amber-600" },
  gold: { bg: "bg-yellow-100", fg: "text-yellow-600" },
  blue: { bg: "bg-blue-100", fg: "text-blue-600" },
  slate: { bg: "bg-slate-100", fg: "text-slate-600" },
};

function Stat({ label, value, icon: Icon, tone = "purple" }) {
  const t = TONES[tone] || TONES.purple;
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

function ActionRow({ to, label, icon: Icon, tone = "blue" }) {
  const t = TONES[tone] || TONES.blue;
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
