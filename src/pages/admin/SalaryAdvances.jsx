import { useState, useEffect } from "react";
import {
  getAllSalaryAdvances,
  updateAdvanceStatus,
} from "../../services/salaryAdvanceService";
import { logAudit } from "../../services/auditService";
import { useAuth } from "../../context/AuthContext";
import Layout from "../../components/Layout";

const STATUS_STYLE = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

export default function SalaryAdvances() {
  const { user } = useAuth();
  const [advances, setAdvances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState("");
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      setAdvances(await getAllSalaryAdvances());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleStatus(adv, status) {
    setUpdating(adv.id);
    try {
      await updateAdvanceStatus(adv.id, status, user.uid, user.email);
      await logAudit({
        action: `salary_advance_${status}`,
        userId: user.uid,
        userEmail: user.email,
        targetId: adv.id,
        targetType: "salaryAdvance",
      });
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setUpdating("");
    }
  }

  const filtered =
    filter === "all" ? advances : advances.filter((a) => a.status === filter);

  return (
    <Layout>
      <div className="p-6 max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#1B4F72]">Salary Advances</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Review and approve salary advance requests
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm mb-4">
            {error}
          </div>
        )}

        <div className="flex gap-2 mb-4 flex-wrap">
          {["all", "pending", "approved", "rejected"].map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filter === s ? "bg-[#1B4F72] text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"}`}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
              {s !== "all" &&
                ` (${advances.filter((a) => a.status === s).length})`}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-[#1B4F72] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
            <div className="text-4xl mb-3">💰</div>
            <h3 className="font-semibold text-gray-700 mb-1">
              No salary advance requests
            </h3>
            <p className="text-gray-400 text-sm">
              Requests submitted by employees will appear here.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">
                    Employee
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">
                    Month
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">
                    Amount (KES)
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">
                    Notes
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">
                    Status
                  </th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((a) => (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">
                        {a.employeeName || "—"}
                      </div>
                      <div className="text-gray-400 text-xs font-mono">
                        {a.contractId?.slice(0, 8)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {a.month || "—"}
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-900">
                      {a.amount?.toLocaleString() || "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs max-w-[180px] truncate">
                      {a.notes || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLE[a.status] || "bg-gray-100 text-gray-500"}`}
                      >
                        {a.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {a.status === "pending" && (
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => handleStatus(a, "approved")}
                            disabled={updating === a.id}
                            className="px-3 py-1 bg-green-100 text-green-700 hover:bg-green-200 rounded text-xs font-medium disabled:opacity-50"
                          >
                            {updating === a.id ? "..." : "Approve"}
                          </button>
                          <button
                            onClick={() => handleStatus(a, "rejected")}
                            disabled={updating === a.id}
                            className="px-3 py-1 bg-red-100 text-red-700 hover:bg-red-200 rounded text-xs font-medium disabled:opacity-50"
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
          </div>
        )}
      </div>
    </Layout>
  );
}

export function SalaryAdvanceLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-[#1B4F72] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
