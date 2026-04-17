import { useState, useEffect } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { getContractsByEmployee } from "../../services/contractService";
import { getLeaveRequestsByEmployee } from "../../services/leaveService";
import { getOvertimeByEmployee } from "../../services/overtimeService";
import { useAuth } from "../../context/AuthContext";
import Layout from "../../components/Layout";
import ActivationGate from "../../components/guards/ActivationGate";
import { useLocation } from "wouter";

const STATUS_BADGE = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

export default function EmployeeDashboard() {
  const { user, role } = useAuth();
  const [, navigate] = useLocation();
  const [contracts, setContracts] = useState([]);
  const [leaveData, setLeaveData] = useState([]);
  const [overtimeData, setOvertimeData] = useState([]);

  useEffect(() => {
    async function load() {
      try {
        const [c, l, o] = await Promise.all([
          getContractsByEmployee(user.uid),
          getLeaveRequestsByEmployee(user.uid),
          getOvertimeByEmployee(user.uid),
        ]);
        setContracts(c);
        setLeaveData(l.slice(0, 5));
        setOvertimeData(o.slice(0, 5));
      } catch (e) {
        console.error(e);
      }
    }
    load();
  }, [user]);

  const contract = contracts[0];
  const pendingLeave = leaveData.filter((l) => l.status === "pending").length;
  const approvedLeave = leaveData.filter((l) => l.status === "approved").length;

  return (
    <ActivationGate>
      <Layout>
        <div className="p-6 max-w-5xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-[#1B4F72]">My Dashboard</h1>
            <p className="text-gray-500 text-sm mt-0.5">
              Welcome, {user?.displayName || user?.email}
            </p>
          </div>

          {contract && (
            <div className="bg-gradient-to-r from-[#1B4F72] to-[#2E86AB] rounded-xl p-6 text-white mb-6">
              <p className="text-blue-200 text-xs font-medium uppercase tracking-wide mb-2">
                My Contract
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Contract Type", value: contract.type || "—" },
                  { label: "Start Date", value: contract.startDate || "—" },
                  {
                    label: "Paid Leave Balance",
                    value: `${contract.leaveBalances?.paid ?? contract.paidLeaveDays ?? "—"} days`,
                  },
                  {
                    label: "Sick Leave Balance",
                    value: `${contract.leaveBalances?.sick ?? contract.sickLeaveDays ?? "—"} days`,
                  },
                ].map((s) => (
                  <div key={s.label}>
                    <p className="text-blue-200 text-xs mb-1">{s.label}</p>
                    <p className="font-semibold">{s.value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
              <p className="text-2xl font-bold text-amber-500">
                {pendingLeave}
              </p>
              <p className="text-xs text-gray-500 mt-1">Pending Leave</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
              <p className="text-2xl font-bold text-green-500">
                {approvedLeave}
              </p>
              <p className="text-xs text-gray-500 mt-1">Approved Leave</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
              <p className="text-2xl font-bold text-[#1B4F72]">
                {overtimeData.length}
              </p>
              <p className="text-xs text-gray-500 mt-1">Overtime Records</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-900">Quick Actions</h2>
              </div>
              <div className="space-y-3">
                {[
                  {
                    label: "Submit Leave Request",
                    path: "/employee/leave",
                    icon: "📅",
                  },
                  {
                    label: "Submit Overtime",
                    path: "/employee/overtime",
                    icon: "⏱️",
                  },
                  {
                    label: "View Documents",
                    path: "/employee/documents",
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
              <h2 className="font-semibold text-gray-900 mb-4">
                Recent Leave Requests
              </h2>
              {leaveData.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">
                  No leave requests yet
                </div>
              ) : (
                <div className="space-y-3">
                  {leaveData.map((l) => (
                    <div
                      key={l.id}
                      className="flex items-center justify-between p-3 border border-gray-100 rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-gray-800 text-sm">
                          {l.leaveType}
                        </p>
                        <p className="text-xs text-gray-400">
                          {l.startDate} → {l.endDate}
                        </p>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[l.status]}`}
                      >
                        {l.status}
                      </span>
                    </div>
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
