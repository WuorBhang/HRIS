import { useState, useEffect } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { getContractsByEmployer } from "../../services/contractService";
import {
  getLeaveForEmployer,
  updateLeaveStatus,
  LEAVE_TYPES,
} from "../../services/leaveService";
import {
  getOvertimeForEmployer,
  updateOvertimeStatus,
} from "../../services/overtimeService";
import { logAudit } from "../../services/auditService";
import { useAuth } from "../../context/AuthContext";
import Layout from "../../components/Layout";

const STATUS_BADGE = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

export default function ManageEmployee() {
  const { user } = useAuth();
  const [contracts, setContracts] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [overtimeRecords, setOvertimeRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("leave");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    loadAll();
  }, [user]);

  async function loadAll() {
    setLoading(true);
    try {
      const [c, l, o] = await Promise.all([
        getContractsByEmployer(user.uid),
        getLeaveForEmployer(user.uid),
        getOvertimeForEmployer(user.uid),
      ]);
      setContracts(c);
      setLeaveRequests(l);
      setOvertimeRecords(o);
    } catch (e) {
      setError("Failed to load: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleLeaveAction(leaveId, status) {
    try {
      await updateLeaveStatus(leaveId, status, user.uid, user.email);
      await logAudit({
        action: status === "approved" ? "approve_leave" : "reject_leave",
        userId: user.uid,
        userEmail: user.email,
        targetId: leaveId,
        targetType: "leaveRequest",
      });
      setSuccess(`Leave request ${status}.`);
      loadAll();
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleOvertimeAction(recordId, status) {
    try {
      await updateOvertimeStatus(recordId, status, user.uid, user.email);
      await logAudit({
        action: status === "approved" ? "approve_overtime" : "reject_overtime",
        userId: user.uid,
        userEmail: user.email,
        targetId: recordId,
        targetType: "overtimeRecord",
      });
      setSuccess(`Overtime record ${status}.`);
      loadAll();
    } catch (e) {
      setError(e.message);
    }
  }

  const empNames = Object.fromEntries(
    contracts.map((c) => [c.employeeId, c.employeeName]),
  );

  return (
    <Layout>
      <div className="p-6 max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#1B4F72]">
            Manage Employees
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Review leave requests and overtime records
          </p>
        </div>

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-green-700 text-sm mb-4">
            ✓ {success}
          </div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm mb-4">
            {error}
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm mb-6 p-5">
          <h2 className="font-semibold text-gray-900 mb-3">
            My Employees ({contracts.length})
          </h2>
          {contracts.length === 0 ? (
            <p className="text-gray-400 text-sm">
              No employees linked to your account yet.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {contracts.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center gap-3 p-3 border border-gray-100 rounded-lg"
                >
                  <div className="w-9 h-9 bg-[#1B4F72] rounded-full flex items-center justify-center text-white font-semibold text-sm">
                    {(c.employeeName || "?")[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-gray-800 text-sm">
                      {c.employeeName}
                    </p>
                    <p className="text-xs text-gray-400">
                      {c.type} • Salary: ${c.grossSalary || "—"}
                    </p>
                  </div>
                  <div className="ml-auto">
                    <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-medium">
                      Active
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-1 mb-4 bg-gray-100 p-1 rounded-lg w-fit">
          {[
            ["leave", "Leave Requests"],
            ["overtime", "Overtime Records"],
          ].map(([tab, label]) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === tab ? "bg-white text-[#1B4F72] shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
            >
              {label}
              {tab === "leave" &&
                leaveRequests.filter((l) => l.status === "pending").length >
                  0 && (
                  <span className="ml-2 bg-amber-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                    {leaveRequests.filter((l) => l.status === "pending").length}
                  </span>
                )}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-[#1B4F72] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : activeTab === "leave" ? (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            {leaveRequests.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-sm">
                No leave requests
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">
                      Employee
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">
                      Type
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">
                      Dates
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">
                      Reason
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">
                      Status
                    </th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-600">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {leaveRequests.map((l) => (
                    <tr key={l.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-800">
                        {empNames[l.employeeId] || "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{l.leaveType}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {l.startDate} → {l.endDate}
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs truncate max-w-[120px]">
                        {l.reason || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[l.status]}`}
                        >
                          {l.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {l.status === "pending" && (
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() =>
                                handleLeaveAction(l.id, "approved")
                              }
                              className="bg-green-100 hover:bg-green-200 text-green-700 px-3 py-1 rounded text-xs font-medium"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() =>
                                handleLeaveAction(l.id, "rejected")
                              }
                              className="bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1 rounded text-xs font-medium"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            {overtimeRecords.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-sm">
                No overtime records
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">
                      Employee
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">
                      Type
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">
                      Date
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">
                      Hours
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">
                      Status
                    </th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-600">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {overtimeRecords.map((o) => (
                    <tr key={o.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-800">
                        {empNames[o.employeeId] || "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{o.type}</td>
                      <td className="px-4 py-3 text-gray-500">{o.date}</td>
                      <td className="px-4 py-3 font-medium text-gray-800">
                        {o.hours}h
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[o.status]}`}
                        >
                          {o.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {o.status === "pending" && (
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() =>
                                handleOvertimeAction(o.id, "approved")
                              }
                              className="bg-green-100 hover:bg-green-200 text-green-700 px-3 py-1 rounded text-xs font-medium"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() =>
                                handleOvertimeAction(o.id, "rejected")
                              }
                              className="bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1 rounded text-xs font-medium"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
