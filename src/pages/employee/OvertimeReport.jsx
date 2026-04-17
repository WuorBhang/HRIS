import { useState, useEffect } from "react";
import { getContractsByEmployee } from "../../services/contractService";
import {
  submitOvertimeRecord,
  getOvertimeByEmployee,
  OVERTIME_TYPES,
} from "../../services/overtimeService";
import { logAudit } from "../../services/auditService";
import { useAuth } from "../../context/AuthContext";
import Layout from "../../components/Layout";

const STATUS_BADGE = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

export default function OvertimeReport() {
  const { user } = useAuth();
  const [contracts, setContracts] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState({
    contractId: "",
    type: OVERTIME_TYPES[0],
    date: "",
    hours: "",
    notes: "",
  });

  useEffect(() => {
    loadAll();
  }, [user]);

  async function loadAll() {
    setLoading(true);
    try {
      const [c, r] = await Promise.all([
        getContractsByEmployee(user.uid),
        getOvertimeByEmployee(user.uid),
      ]);
      setContracts(c);
      setRecords(r);
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
    if (parseFloat(form.hours) <= 0) {
      setError("Hours must be greater than 0.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const contract = contracts.find((c) => c.id === form.contractId);
      const result = await submitOvertimeRecord({
        ...form,
        hours: parseFloat(form.hours),
        employeeId: user.uid,
        employeeEmail: user.email,
        employerId: contract?.employerId,
      });
      await logAudit({
        action: "submit_overtime",
        userId: user.uid,
        userEmail: user.email,
        targetId: result.id,
        targetType: "overtimeRecord",
      });
      setSuccess("Overtime record submitted successfully.");
      setForm((f) => ({ ...f, date: "", hours: "", notes: "" }));
      loadAll();
    } catch (e) {
      setError("Failed to submit: " + e.message);
    } finally {
      setSubmitting(false);
    }
  }

  const totalApprovedHours = records
    .filter((r) => r.status === "approved")
    .reduce((sum, r) => sum + (parseFloat(r.hours) || 0), 0);

  return (
    <Layout>
      <div className="p-6 max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#1B4F72]">
            Overtime & Holiday Report
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Submit overtime and holiday work records
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
            <p className="text-2xl font-bold text-[#1B4F72]">
              {records.length}
            </p>
            <p className="text-xs text-gray-500 mt-1">Total Submissions</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
            <p className="text-2xl font-bold text-amber-500">
              {records.filter((r) => r.status === "pending").length}
            </p>
            <p className="text-xs text-gray-500 mt-1">Pending Review</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
            <p className="text-2xl font-bold text-green-500">
              {totalApprovedHours.toFixed(1)}h
            </p>
            <p className="text-xs text-gray-500 mt-1">Approved Hours</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">
            Submit New Record
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Record Type *
                </label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  required
                  className="input-field"
                >
                  {OVERTIME_TYPES.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date *
                </label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  required
                  className="input-field"
                  max={new Date().toISOString().slice(0, 10)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hours *
                </label>
                <input
                  type="number"
                  value={form.hours}
                  onChange={(e) => setForm({ ...form, hours: e.target.value })}
                  required
                  min="0.5"
                  max="24"
                  step="0.5"
                  className="input-field"
                  placeholder="e.g. 2.5"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes (optional)
              </label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={2}
                className="input-field resize-none"
                placeholder="Describe the overtime work..."
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
              disabled={submitting || !form.date || !form.hours}
              className="flex items-center gap-2 bg-[#1B4F72] hover:bg-[#154360] text-white px-5 py-2.5 rounded-lg text-sm font-medium disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />{" "}
                  Submitting...
                </>
              ) : (
                "Submit Record"
              )}
            </button>
          </form>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-900">
              My Submissions
            </h2>
          </div>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-4 border-[#1B4F72] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : records.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">
              No overtime records submitted yet
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
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
                    Notes
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {records.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">
                      {r.type}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{r.date}</td>
                    <td className="px-4 py-3 font-semibold text-[#1B4F72]">
                      {r.hours}h
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs max-w-[150px] truncate">
                      {r.notes || "—"}
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
