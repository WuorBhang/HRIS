import { useState, useEffect } from "react";
import { getContractsByEmployee } from "../../services/contractService";
import {
  submitLeaveRequest,
  getLeaveRequestsByEmployee,
  LEAVE_TYPES,
} from "../../services/leaveService";
import { logAudit } from "../../services/auditService";
import { useAuth } from "../../context/AuthContext";
import Layout from "../../components/Layout";

const STATUS_BADGE = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

export default function LeaveRequest() {
  const { user } = useAuth();
  const [contracts, setContracts] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState({
    contractId: "",
    leaveType: LEAVE_TYPES[0],
    startDate: "",
    endDate: "",
    reason: "",
  });

  useEffect(() => {
    loadAll();
  }, [user]);

  async function loadAll() {
    setLoading(true);
    try {
      const [c, r] = await Promise.all([
        getContractsByEmployee(user.uid),
        getLeaveRequestsByEmployee(user.uid),
      ]);
      setContracts(c);
      setRequests(r);
      if (c[0]) setForm((f) => ({ ...f, contractId: c[0].id }));
    } catch (e) {
      setError("Failed to load: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.contractId) {
      setError("No active contract found.");
      return;
    }
    if (new Date(form.startDate) > new Date(form.endDate)) {
      setError("Start date must be before end date.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const contract = contracts.find((c) => c.id === form.contractId);
      const result = await submitLeaveRequest({
        ...form,
        employeeId: user.uid,
        employeeEmail: user.email,
        employerId: contract?.employerId,
      });
      await logAudit({
        action: "submit_leave_request",
        userId: user.uid,
        userEmail: user.email,
        targetId: result.id,
        targetType: "leaveRequest",
      });
      setSuccess(
        "Leave request submitted successfully. Your employer will review it.",
      );
      setForm((f) => ({ ...f, startDate: "", endDate: "", reason: "" }));
      loadAll();
    } catch (e) {
      setError("Failed to submit: " + e.message);
    } finally {
      setSubmitting(false);
    }
  }

  const contract = contracts[0];

  return (
    <Layout>
      <div className="p-6 max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#1B4F72]">Leave Request</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Submit a leave request for your employer to review
          </p>
        </div>

        {contract && (
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6 grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-blue-500 text-xs font-medium">
                Paid Leave Balance
              </p>
              <p className="font-bold text-blue-900">
                {contract.leaveBalances?.paid ?? contract.paidLeaveDays ?? "—"}{" "}
                days
              </p>
            </div>
            <div>
              <p className="text-blue-500 text-xs font-medium">
                Sick Leave Balance
              </p>
              <p className="font-bold text-blue-900">
                {contract.leaveBalances?.sick ?? contract.sickLeaveDays ?? "—"}{" "}
                days
              </p>
            </div>
            <div>
              <p className="text-blue-500 text-xs font-medium">
                Compassionate Balance
              </p>
              <p className="font-bold text-blue-900">
                {contract.leaveBalances?.compassion ??
                  contract.compassionLeaveDays ??
                  "—"}{" "}
                days
              </p>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">
            New Leave Request
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Leave Type *
                </label>
                <select
                  value={form.leaveType}
                  onChange={(e) =>
                    setForm({ ...form, leaveType: e.target.value })
                  }
                  required
                  className="input-field"
                >
                  {LEAVE_TYPES.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={(e) =>
                      setForm({ ...form, startDate: e.target.value })
                    }
                    required
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Date *
                  </label>
                  <input
                    type="date"
                    value={form.endDate}
                    onChange={(e) =>
                      setForm({ ...form, endDate: e.target.value })
                    }
                    required
                    className="input-field"
                    min={form.startDate}
                  />
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reason (optional)
              </label>
              <textarea
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                rows={3}
                className="input-field resize-none"
                placeholder="Briefly describe the reason for your leave..."
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
                {error}
              </div>
            )}
            {success && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-green-700 text-sm">
                ✓ {success}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || !form.startDate || !form.endDate}
              className="flex items-center gap-2 bg-[#1B4F72] hover:bg-[#154360] text-white px-5 py-2.5 rounded-lg text-sm font-medium disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />{" "}
                  Submitting...
                </>
              ) : (
                "Submit Leave Request"
              )}
            </button>
          </form>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-900">
              My Leave History
            </h2>
          </div>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-4 border-[#1B4F72] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">
              No leave requests submitted yet
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
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
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {requests.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">
                      {r.leaveType}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {r.startDate} → {r.endDate}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs max-w-[150px] truncate">
                      {r.reason || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[r.status]}`}
                      >
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </Layout>
  );
}
