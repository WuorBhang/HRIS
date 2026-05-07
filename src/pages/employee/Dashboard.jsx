// Employee dashboard: contract info + quick actions + recent activity.
import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { FaUmbrellaBeach, FaClock, FaSun, FaFolderOpen } from "react-icons/fa";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../lib/firebase";
import { COLLECTIONS } from "../../lib/constants";
import { formatDate, formatTs, statusLabel } from "../../lib/utils";
import { Card, PageHeader } from "../../lib/ui";
import Layout from "../../components/Layout";
import MySubmissions from "../../components/MySubmissions";
import UpcomingHolidays from "../../components/UpcomingHolidays";
import {
  QuickActions,
  RecentActivity,
  RecentDocuments,
} from "../../components/DashboardWidgets";

export default function EmployeeDashboard() {
  const { user, profile } = useAuth();
  const [contract, setContract] = useState(null);
  const [recent, setRecent] = useState([]);
  const [docs, setDocs] = useState([]);

  useEffect(() => {
    if (!user) return;
    getDocs(
      query(
        collection(db, COLLECTIONS.CONTRACTS),
        where("employeeId", "==", user.uid),
      ),
    )
      .then((s) => {
        const docs = s.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort(
            (a, b) =>
              (b.createdAt?.toMillis?.() || 0) -
              (a.createdAt?.toMillis?.() || 0),
          );
        setContract(docs[0] || null);
      })
      .catch(() => {});
    const uDocs = onSnapshot(
      query(
        collection(db, COLLECTIONS.DOCUMENTS),
        where("ownerId", "==", user.uid),
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
    return () => uDocs();
  }, [user]);

  const ACTIONS = [
    { label: "Request Leave", icon: FaUmbrellaBeach, to: "/employee/leave" },
    { label: "Log Overtime", icon: FaClock, to: "/employee/overtime" },
    { label: "Holiday Work", icon: FaSun, to: "/employee/holiday" },
    { label: "My Documents", icon: FaFolderOpen, to: "/employee/documents" },
  ];

  return (
    <Layout>
      <PageHeader
        title={`Hello, ${profile?.fullName?.split(" ")[0] || "there"}`}
        subtitle="Your workspace."
      />
      <UpcomingHolidays horizontal />
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-3 space-y-6">
          <Card>
            <div className="flex items-center justify-between gap-3 mb-3">
              <h2 className="font-semibold text-primary">Contract</h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                {statusLabel(profile?.status)}
              </span>
            </div>
            {!contract ? (
              <div className="text-sm text-muted-foreground">
                No contract linked yet — admin will set this up.
              </div>
            ) : (
              <div className="text-sm space-y-1">
                <div>
                  <b>Employer:</b> {contract.employerName}
                </div>
                <div>
                  <b>Type:</b> {contract.type}
                </div>
                <div>
                  <b>Start:</b> {formatDate(contract.startDate)}
                  {contract.endDate ? ` → ${formatDate(contract.endDate)}` : ""}
                </div>
                {(contract.roles || []).length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {contract.roles.map((r) => (
                      <span
                        key={r}
                        className="bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full"
                      >
                        {r}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </Card>

          <section>
            <h2 className="font-semibold text-primary mb-3">Quick actions</h2>
            <QuickActions items={ACTIONS} />
          </section>

          <RecentActivity
            items={recent}
            formatTs={formatTs}
            title="My recent activity"
          />

          <RecentDocuments
            items={docs}
            title="Recent documents"
            viewAllHref="/employee/documents"
            emptyText="No documents shared with you yet."
          />

          <MySubmissions mode="leave" />
        </div>
      </div>
    </Layout>
  );
}
