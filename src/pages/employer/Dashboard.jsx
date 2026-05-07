// Employer dashboard with stats + quick actions + recent activity.
import { useEffect, useMemo, useState } from "react";
import {
  collection,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { Users, FileText, Briefcase } from "lucide-react";
import {
  FaUserTie,
  FaUserPlus,
  FaFileSignature,
  FaCloudUploadAlt,
} from "react-icons/fa";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../lib/firebase";
import { COLLECTIONS } from "../../lib/constants";
import { formatTs } from "../../lib/utils";
import { PageHeader } from "../../lib/ui";
import Layout from "../../components/Layout";
import UpcomingHolidays from "../../components/UpcomingHolidays";
import {
  QuickActions,
  RecentActivity,
  RecentDocuments,
} from "../../components/DashboardWidgets";

const Stat = ({ label, value, icon: I }) => (
  <div className="bg-card rounded-lg shadow p-4 flex items-center gap-4">
    <div className="w-12 h-12 rounded-md bg-primary/10 text-primary flex items-center justify-center">
      <I className="w-6 h-6" />
    </div>
    <div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </div>
  </div>
);

export default function EmployerDashboard() {
  const { user } = useAuth();
  const [contracts, setContracts] = useState([]);
  const [pending, setPending] = useState(0);
  const [recent, setRecent] = useState([]);
  const [docs, setDocs] = useState([]);

  useEffect(() => {
    if (!user) return;
    const u1 = onSnapshot(
      query(
        collection(db, COLLECTIONS.CONTRACTS),
        where("employerId", "==", user.uid),
      ),
      (s) => setContracts(s.docs.map((d) => ({ id: d.id, ...d.data() }))),
      () => {},
    );
    const u2 = onSnapshot(
      query(
        collection(db, COLLECTIONS.LEAVE_REQUESTS),
        where("employerId", "==", user.uid),
        where("status", "==", "pending"),
      ),
      (s) => setPending(s.size),
      () => {},
    );
    const u3 = onSnapshot(
      query(
        collection(db, COLLECTIONS.DOCUMENTS),
        where("employerId", "==", user.uid),
      ),
      (s) =>
        setDocs(
          s.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .sort(
              (a, b) =>
                (b.uploadedAt?.toMillis?.() || 0) -
                (a.uploadedAt?.toMillis?.() || 0),
            )
            .slice(0, 5),
        ),
      () => setDocs([]),
    );
    getDocs(
      query(
        collection(db, COLLECTIONS.ACTIVITY_LOGS),
        where("performedBy", "==", user.uid),
        orderBy("createdAt", "desc"),
        limit(8),
      ),
    )
      .then((s) => setRecent(s.docs.map((d) => ({ id: d.id, ...d.data() }))))
      .catch(() => {});
    return () => {
      u1();
      u2();
      u3();
    };
  }, [user]);

  const employees = useMemo(
    () => new Set(contracts.map((c) => c.employeeId)).size,
    [contracts],
  );

  const ACTIONS = [
    { label: "View Employees", icon: FaUserTie, to: "/employer/employees" },
    {
      label: "Leave Requests",
      icon: FaUserPlus,
      to: "/employer/leave-requests",
    },
    { label: "Timesheets", icon: FaFileSignature, to: "/employer/timesheets" },
    {
      label: "Upload Documents",
      icon: FaCloudUploadAlt,
      to: "/employer/documents",
    },
  ];

  return (
    <Layout>
      <PageHeader
        title="Employer dashboard"
        subtitle="Your team at a glance."
      />
      <UpcomingHolidays horizontal />
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <Stat label="Active employees" value={employees} icon={Users} />
        <Stat label="Pending leave" value={pending} icon={FileText} />
        <Stat
          label="Active contracts"
          value={contracts.length}
          icon={Briefcase}
        />
      </div>

      <section className="mb-6">
        <h2 className="font-semibold text-primary mb-3">Quick actions</h2>
        <QuickActions items={ACTIONS} />
      </section>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-3">
          <RecentDocuments
            items={docs}
            title="Recent documents"
            viewAllHref="/employer/documents"
            emptyText="No documents shared yet."
          />
        </div>
        <div className="lg:col-span-3">
          <RecentActivity
            items={recent}
            formatTs={formatTs}
            title="My recent activity"
          />
        </div>
      </div>
    </Layout>
  );
}
