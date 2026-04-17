import { useState, useEffect } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../lib/firebase";
import Layout from "../../components/Layout";

function StatCard({ label, value, icon, color }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
      <div
        className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${color}`}
      >
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value ?? "—"}</p>
        <p className="text-sm text-gray-500">{label}</p>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    users: 0,
    contracts: 0,
    pendingLeave: 0,
    documents: 0,
  });
  const [recentLogs, setRecentLogs] = useState([]);

  useEffect(() => {
    async function load() {
      try {
        const [usersSnap, contractsSnap, leaveSnap, docsSnap, logsSnap] =
          await Promise.all([
            getDocs(collection(db, "userProfiles")),
            getDocs(collection(db, "contracts")),
            getDocs(
              query(
                collection(db, "leaveRequests"),
                where("status", "==", "pending"),
              ),
            ),
            getDocs(collection(db, "documents")),
            getDocs(collection(db, "auditLogs")),
          ]);
        setStats({
          users: usersSnap.size,
          contracts: contractsSnap.size,
          pendingLeave: leaveSnap.size,
          documents: docsSnap.size,
        });
        const logs = logsSnap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort(
            (a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0),
          )
          .slice(0, 10);
        setRecentLogs(logs);
      } catch (e) {
        console.error(e);
      }
    }
    load();
  }, []);

  return (
    <Layout>
      <div className="p-6 max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#1B4F72]">Admin Dashboard</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            SafiHub system overview
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            label="Users"
            value={stats.users}
            icon="👤"
            color="bg-blue-50"
          />
          <StatCard
            label="Contracts"
            value={stats.contracts}
            icon="📋"
            color="bg-green-50"
          />
          <StatCard
            label="Pending Leave"
            value={stats.pendingLeave}
            icon="⏳"
            color="bg-amber-50"
          />
          <StatCard
            label="Documents"
            value={stats.documents}
            icon="📁"
            color="bg-purple-50"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Quick Actions</h2>
            <div className="space-y-3">
              {[
                {
                  label: "Create Employer Account",
                  path: "/admin/users",
                  icon: "🏢",
                },
                {
                  label: "Create Employee Account",
                  path: "/admin/users",
                  icon: "👷",
                },
                {
                  label: "Manage Contracts",
                  path: "/admin/contracts",
                  icon: "📋",
                },
                {
                  label: "Upload Documents",
                  path: "/admin/documents",
                  icon: "📄",
                },
                { label: "View Audit Logs", path: "/admin/audit", icon: "🔍" },
              ].map((a) => (
                <a
                  key={a.label}
                  href={a.path}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 border border-gray-100 transition-colors group"
                >
                  <span className="text-xl">{a.icon}</span>
                  <span className="text-sm font-medium text-gray-700 group-hover:text-[#1B4F72]">
                    {a.label}
                  </span>
                  <svg
                    className="w-4 h-4 ml-auto text-gray-400 group-hover:text-[#1B4F72]"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </a>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-semibold text-gray-900 mb-4">
              Recent Activity
            </h2>
            {recentLogs.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">
                No activity logged yet
              </div>
            ) : (
              <div className="space-y-3">
                {recentLogs.map((log) => (
                  <div key={log.id} className="flex items-start gap-3 text-sm">
                    <div className="w-2 h-2 rounded-full bg-[#1B4F72] mt-1.5 flex-shrink-0" />
                    <div>
                      <p className="text-gray-700 font-medium">{log.action}</p>
                      <p className="text-gray-400 text-xs">{log.userEmail}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
export function AdminDashboardLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-[#1B4F72] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
