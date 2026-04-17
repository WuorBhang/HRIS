import { useState, useEffect } from "react";
import { getContractsByEmployer } from "../../services/contractService";
import {
  getMonthlyRecordsForEmployer,
  approveMonth,
  getOrCreateMonthlyRecord,
} from "../../services/monthlyService";
import { getLeaveRequestsByContract } from "../../services/leaveService";
import { getOvertimeByContract } from "../../services/overtimeService";
import { logAudit } from "../../services/auditService";
import { useAuth } from "../../context/AuthContext";
import Layout from "../../components/Layout";

const MONTHS = Array.from({ length: 12 }, (_, i) => {
  const d = new Date();
  d.setMonth(d.getMonth() - i);
  return d.toISOString().slice(0, 7);
});

export default function TimesheetApproval() {
  const { user } = useAuth();
  const [contracts, setContracts] = useState([]);
  const [selectedContract, setSelectedContract] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(MONTHS[0]);
  const [monthlyRecord, setMonthlyRecord] = useState(null);
  const [leaveData, setLeaveData] = useState([]);
  const [overtimeData, setOvertimeData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [approving, setApproving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    getContractsByEmployer(user.uid).then(setContracts).catch(console.error);
  }, [user]);

  async function loadMonthlyData() {
    if (!selectedContract || !selectedMonth) return;
    setLoading(true);
    setError("");
    try {
      const [record, leave, overtime] = await Promise.all([
        getOrCreateMonthlyRecord(selectedContract, selectedMonth),
        getLeaveRequestsByContract(selectedContract),
        getOvertimeByContract(selectedContract),
      ]);
      setMonthlyRecord(record);
      setLeaveData(
        leave.filter(
          (l) =>
            l.startDate?.startsWith(selectedMonth) ||
            l.endDate?.startsWith(selectedMonth),
        ),
      );
      setOvertimeData(
        overtime.filter((o) => o.date?.startsWith(selectedMonth)),
      );
    } catch (e) {
      setError("Failed to load: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (selectedContract) loadMonthlyData();
  }, [selectedContract, selectedMonth]);

  async function handleApprove() {
    if (!monthlyRecord) return;
    setApproving(true);
    try {
      await approveMonth(monthlyRecord.id, user.uid, user.email);
      await logAudit({
        action: "approve_timesheet",
        userId: user.uid,
        userEmail: user.email,
        targetId: monthlyRecord.id,
        targetType: "monthlyRecord",
        details: { month: selectedMonth, contractId: selectedContract },
      });
      setSuccess(`Timesheet for ${selectedMonth} approved and locked.`);
      loadMonthlyData();
    } catch (e) {
      setError(e.message);
    } finally {
      setApproving(false);
    }
  }

  const totalLeaveDays = leaveData
    .filter((l) => l.status === "approved")
    .reduce((sum, l) => {
      if (!l.startDate || !l.endDate) return sum;
      const start = new Date(l.startDate);
      const end = new Date(l.endDate);
      return sum + Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    }, 0);

  const totalOvertimeHours = overtimeData
    .filter((o) => o.status === "approved")
    .reduce((sum, o) => sum + (parseFloat(o.hours) || 0), 0);

  return (
    <Layout>
      <div className="p-6 max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#1B4F72]">
            Timesheet Approval
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Review and approve monthly timesheets
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Employee Contract
              </label>
              <select
                value={selectedContract}
                onChange={(e) => setSelectedContract(e.target.value)}
                className="input-field"
              >
                <option value="">Select contract...</option>
                {contracts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.employeeName} ({c.contractRef || c.id.slice(0, 6)})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Month
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="input-field"
              >
                {MONTHS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm mb-4">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-green-700 text-sm mb-4">
            ✓ {success}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-[#1B4F72] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          selectedContract &&
          monthlyRecord && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-gray-900">
                    Monthly Summary — {selectedMonth}
                  </h2>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      monthlyRecord.locked
                        ? "bg-red-100 text-red-700"
                        : monthlyRecord.approved
                          ? "bg-green-100 text-green-700"
                          : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {monthlyRecord.locked
                      ? "🔒 Locked"
                      : monthlyRecord.approved
                        ? "✅ Approved"
                        : "⏳ Open"}
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    {
                      label: "Leave Requests",
                      value: leaveData.length,
                      sub: `${leaveData.filter((l) => l.status === "pending").length} pending`,
                    },
                    {
                      label: "Approved Leave Days",
                      value: totalLeaveDays,
                      sub: "days",
                    },
                    {
                      label: "Overtime Records",
                      value: overtimeData.length,
                      sub: `${overtimeData.filter((o) => o.status === "pending").length} pending`,
                    },
                    {
                      label: "Approved OT Hours",
                      value: totalOvertimeHours.toFixed(1),
                      sub: "hours",
                    },
                  ].map((s) => (
                    <div
                      key={s.label}
                      className="bg-gray-50 rounded-lg p-4 text-center"
                    >
                      <p className="text-2xl font-bold text-[#1B4F72]">
                        {s.value}
                      </p>
                      <p className="text-xs font-medium text-gray-700 mt-1">
                        {s.label}
                      </p>
                      <p className="text-xs text-gray-400">{s.sub}</p>
                    </div>
                  ))}
                </div>

                {!monthlyRecord.locked && (
                  <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                    <p className="text-sm text-gray-500">
                      Once approved, this timesheet will be locked and cannot be
                      modified without admin intervention.
                    </p>
                    <button
                      onClick={handleApprove}
                      disabled={approving}
                      className="flex items-center gap-2 bg-[#1B4F72] hover:bg-[#154360] text-white px-5 py-2.5 rounded-lg text-sm font-medium disabled:opacity-60"
                    >
                      {approving ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />{" "}
                          Approving...
                        </>
                      ) : (
                        "Approve & Lock Month"
                      )}
                    </button>
                  </div>
                )}
                {monthlyRecord.locked && monthlyRecord.approvedAt && (
                  <div className="mt-4 pt-4 border-t border-gray-100 text-xs text-gray-400">
                    Approved by {monthlyRecord.approverEmail} on{" "}
                    {monthlyRecord.approvedAt
                      ?.toDate?.()
                      ?.toLocaleDateString() || "—"}
                  </div>
                )}
              </div>

              {leaveData.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-100">
                    <h3 className="font-semibold text-gray-900">
                      Leave Requests This Month
                    </h3>
                  </div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="text-left px-4 py-2 font-semibold text-gray-600">
                          Type
                        </th>
                        <th className="text-left px-4 py-2 font-semibold text-gray-600">
                          Dates
                        </th>
                        <th className="text-left px-4 py-2 font-semibold text-gray-600">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {leaveData.map((l) => (
                        <tr key={l.id}>
                          <td className="px-4 py-2">{l.leaveType}</td>
                          <td className="px-4 py-2 text-gray-500">
                            {l.startDate} → {l.endDate}
                          </td>
                          <td className="px-4 py-2">
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-medium ${{ pending: "bg-amber-100 text-amber-700", approved: "bg-green-100 text-green-700", rejected: "bg-red-100 text-red-700" }[l.status]}`}
                            >
                              {l.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )
        )}
      </div>
    </Layout>
  );
}
