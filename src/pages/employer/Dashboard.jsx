import { useState, useEffect } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useAuth } from "../../context/AuthContext";
import Layout from "../../components/Layout";
import ActivationGate from "../../components/guards/ActivationGate";
import { useLocation } from "wouter";

export default function EmployerDashboard() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [stats, setStats] = useState({
    employees: 0,
    pendingLeave: 0,
    contracts: 0,
  });
  const [employees, setEmployees] = useState([]);

  useEffect(() => {
    async function load() {
      try {
        const [contractsSnap, leaveSnap] = await Promise.all([
          getDocs(
            query(
              collection(db, "contracts"),
              where("employerId", "==", user.uid),
            ),
          ),
          getDocs(
            query(
              collection(db, "leaveRequests"),
              where("employerId", "==", user.uid),
              where("status", "==", "pending"),
            ),
          ),
        ]);
        const contracts = contractsSnap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        const uniqueEmployees = [
          ...new Set(contracts.map((c) => c.employeeId)),
        ];
        setStats({
          employees: uniqueEmployees.length,
          pendingLeave: leaveSnap.size,
          contracts: contracts.length,
        });
        setEmployees(contracts);
      } catch (e) {
        console.error(e);
      }
    }
    load();
  }, [user]);

  return (
    <ActivationGate>
      <Layout>
        <div className="p-6 max-w-5xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-[#1B4F72]">
              Employer Dashboard
            </h1>
            <p className="text-gray-500 text-sm mt-0.5">
              Welcome back, {user?.displayName || user?.email}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-8">
            {[
              {
                label: "Active Employees",
                value: stats.employees,
                icon: "👷",
                color: "bg-blue-50",
              },
              {
                label: "Pending Leave Requests",
                value: stats.pendingLeave,
                icon: "⏳",
                color: "bg-amber-50",
              },
              {
                label: "Active Contracts",
                value: stats.contracts,
                icon: "📋",
                color: "bg-green-50",
              },
            ].map((s) => (
              <div
                key={s.label}
                className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex items-center gap-4"
              >
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${s.color}`}
                >
                  {s.icon}
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                  <p className="text-sm text-gray-500">{s.label}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h2 className="font-semibold text-gray-900 mb-4">
                Quick Actions
              </h2>
              <div className="space-y-3">
                {[
                  {
                    label: "View Employees",
                    path: "/employer/employees",
                    icon: "👷",
                  },
                  {
                    label: "Approve Leave Requests",
                    path: "/employer/leave",
                    icon: "✅",
                  },
                  {
                    label: "Review Timesheets",
                    path: "/employer/timesheets",
                    icon: "📊",
                  },
                  {
                    label: "View Documents",
                    path: "/employer/documents",
                    icon: "📄",
                  },
                ].map((a) => (
                  <button
                    key={a.label}
                    onClick={() => navigate(a.path)}
                    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 border border-gray-100 text-left group"
                  >
                    <span className="text-xl">{a.icon}</span>
                    <span className="text-sm font-medium text-gray-700 group-hover:text-[#1B4F72]">
                      {a.label}
                    </span>
                    <svg
                      className="w-4 h-4 ml-auto text-gray-400"
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
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h2 className="font-semibold text-gray-900 mb-4">My Employees</h2>
              {employees.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">
                  No employees linked yet. Contact SafiHub admin.
                </div>
              ) : (
                <div className="space-y-3">
                  {employees.map((c) => (
                    <button
                      key={c.id}
                      onClick={() =>
                        navigate(`/employer/employees/${c.employeeId}`)
                      }
                      className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 border border-gray-100 text-left"
                    >
                      <div className="w-9 h-9 bg-[#1B4F72] rounded-full flex items-center justify-center text-white font-semibold text-sm">
                        {(c.employeeName || "?")[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-gray-800 text-sm">
                          {c.employeeName || "Unknown"}
                        </p>
                        <p className="text-xs text-gray-400">
                          {c.type} • Since {c.startDate || "—"}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </Layout>
    </ActivationGate>
  );
}

export function EmployerDashboardLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-[#1B4F72] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
