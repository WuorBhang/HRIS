// Admin dashboard with stats, quick actions, recent activity.
import { useEffect, useState } from "react";
import {
  collection,
  getCountFromServer,
  getDocs,
  limit,
  orderBy,
  query,
} from "firebase/firestore";
import { Users, Briefcase, FileText } from "lucide-react";
import {
  FaUserTie,
  FaUserPlus,
  FaFileSignature,
  FaCloudUploadAlt,
} from "react-icons/fa";
import { db } from "../../lib/firebase";
import { COLLECTIONS } from "../../lib/constants";
import { formatTs } from "../../lib/utils";
import { PageHeader } from "../../lib/ui";
import Layout from "../../components/Layout";
import UpcomingHolidays from "../../components/UpcomingHolidays";
import {
  QuickActions,
  RecentActivity,
} from "../../components/DashboardWidgets";

const Stat = ({ label, value, icon: I }) => (
  <div className="bg-card rounded-lg shadow p-4 flex items-center gap-4">
    <div className="w-12 h-12 rounded-md bg-primary/10 text-primary flex items-center justify-center">
      <I className="w-6 h-6" />
    </div>
    <div>
      <div className="text-2xl font-bold">{value ?? "—"}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </div>
  </div>
);

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    users: null,
    contracts: null,
    leave: null,
    docs: null,
  });
  const [recent, setRecent] = useState([]);

  useEffect(() => {
    const col = (c) => collection(db, c);
    Promise.all([
      getCountFromServer(col(COLLECTIONS.USERS)),
      getCountFromServer(col(COLLECTIONS.CONTRACTS)),
      getCountFromServer(col(COLLECTIONS.LEAVE_REQUESTS)),
      getCountFromServer(col(COLLECTIONS.DOCUMENTS)),
    ])
      .then(([u, c, l, d]) =>
        setStats({
          users: u.data().count,
          contracts: c.data().count,
          leave: l.data().count,
          docs: d.data().count,
        }),
      )
      .catch(() => {});
    getDocs(
      query(
        collection(db, COLLECTIONS.ACTIVITY_LOGS),
        orderBy("createdAt", "desc"),
        limit(8),
      ),
    )
      .then((s) => setRecent(s.docs.map((d) => ({ id: d.id, ...d.data() }))))
      .catch(() => {});
  }, []);

  const ACTIONS = [
    { label: "Create Employer Account", icon: FaUserTie, to: "/admin/users" },
    { label: "Create Employee Account", icon: FaUserPlus, to: "/admin/users" },
    {
      label: "Manage Contracts",
      icon: FaFileSignature,
      to: "/admin/contracts",
    },
    {
      label: "Upload Documents",
      icon: FaCloudUploadAlt,
      to: "/admin/documents",
    },
  ];

  return (
    <Layout>
      <PageHeader title="Admin dashboard" subtitle="System-wide overview." />
      <UpcomingHolidays horizontal />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Stat label="Total users" value={stats.users} icon={Users} />
        <Stat label="Contracts" value={stats.contracts} icon={Briefcase} />
        <Stat label="Leave requests" value={stats.leave} icon={FileText} />
        <Stat label="Documents" value={stats.docs} icon={FileText} />
      </div>

      <section className="mb-6">
        <h2 className="font-semibold text-primary mb-3">Quick actions</h2>
        <QuickActions items={ACTIONS} />
      </section>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-3">
          <RecentActivity items={recent} formatTs={formatTs} />
        </div>
      </div>
    </Layout>
  );
}
