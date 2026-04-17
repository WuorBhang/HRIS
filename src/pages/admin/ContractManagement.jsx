import { useState, useEffect } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../../lib/firebase";
import {
  createContract,
  getAllContracts,
  updateContract,
} from "../../services/contractService";
import { logAudit } from "../../services/auditService";
import { useAuth } from "../../context/AuthContext";
import Layout from "../../components/Layout";

const CONTRACT_TYPES = ["Live-in", "Live-out", "Part-time"];
const JOB_ROLES = [
  "Nanny",
  "Cleaner",
  "Cook",
  "Driver",
  "Gardener",
  "Security",
  "Housekeeper",
  "Other",
];

const EMPTY_FORM = {
  employerId: "",
  employeeId: "",
  contractRef: "",
  startDate: "",
  endDate: "",
  probationEndDate: "",
  type: "Live-out",
  employeeRole: "",
  employmentLocation: "",
  workingHoursPerWeek: "45",
  grossSalary: "",
  hourlySalary: "",
  allowances: "",
  paidLeaveDays: "20",
  sickLeaveDays: "10",
  compassionLeaveDays: "3",
  overtimeMultiplier: "1.5",
  holidayMultiplier: "2.0",
  codeOfConductSigned: false,
};

export default function ContractManagement() {
  const { user } = useAuth();
  const [contracts, setContracts] = useState([]);
  const [employers, setEmployers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editContract, setEditContract] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [contSnap, profileSnap] = await Promise.all([
        getAllContracts(),
        getDocs(
          query(collection(db, "userProfiles"), orderBy("createdAt", "desc")),
        ),
      ]);
      setContracts(contSnap);
      const profiles = profileSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setEmployers(profiles.filter((p) => p.role === "employer"));
      setEmployees(profiles.filter((p) => p.role === "employee"));
    } catch (e) {
      setError("Failed to load: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  function openEdit(c) {
    setEditContract(c);
    setForm({
      employerId: c.employerId || "",
      employeeId: c.employeeId || "",
      contractRef: c.contractRef || "",
      startDate: c.startDate || "",
      endDate: c.endDate || "",
      probationEndDate: c.probationEndDate || "",
      type: c.type || "Live-out",
      employeeRole: c.employeeRole || "",
      employmentLocation: c.employmentLocation || "",
      workingHoursPerWeek: c.workingHoursPerWeek ?? "45",
      grossSalary: c.grossSalary || "",
      hourlySalary: c.hourlySalary || "",
      allowances: c.allowances || "",
      paidLeaveDays: c.paidLeaveDays ?? "20",
      sickLeaveDays: c.sickLeaveDays ?? "10",
      compassionLeaveDays: c.compassionLeaveDays ?? "3",
      overtimeMultiplier: c.overtimeMultiplier ?? "1.5",
      holidayMultiplier: c.holidayMultiplier ?? "2.0",
      codeOfConductSigned: c.codeOfConductSigned ?? false,
    });
    setShowCreate(true);
  }

  function openNew() {
    setEditContract(null);
    setForm(EMPTY_FORM);
    setError("");
    setShowCreate(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const employer = employers.find((x) => x.uid === form.employerId);
      const employee = employees.find((x) => x.uid === form.employeeId);
      const payload = {
        ...form,
        grossSalary: parseFloat(form.grossSalary) || 0,
        hourlySalary: parseFloat(form.hourlySalary) || 0,
        allowances: parseFloat(form.allowances) || 0,
        workingHoursPerWeek: parseInt(form.workingHoursPerWeek) || 45,
        paidLeaveDays: parseInt(form.paidLeaveDays) || 20,
        sickLeaveDays: parseInt(form.sickLeaveDays) || 10,
        compassionLeaveDays: parseInt(form.compassionLeaveDays) || 3,
        overtimeMultiplier: parseFloat(form.overtimeMultiplier) || 1.5,
        holidayMultiplier: parseFloat(form.holidayMultiplier) || 2.0,
        employerName: employer?.displayName || employer?.email || "",
        employeeName: employee?.displayName || employee?.email || "",
        leaveBalances: {
          paid: parseInt(form.paidLeaveDays) || 20,
          sick: parseInt(form.sickLeaveDays) || 10,
          compassion: parseInt(form.compassionLeaveDays) || 3,
        },
      };
      if (editContract) {
        await updateContract(editContract.id, payload);
        setSuccess("Contract updated.");
        await logAudit({
          action: "update_contract",
          userId: user.uid,
          userEmail: user.email,
          targetId: editContract.id,
          targetType: "contract",
        });
      } else {
        const created = await createContract(payload);
        setSuccess("Contract created.");
        await logAudit({
          action: "create_contract",
          userId: user.uid,
          userEmail: user.email,
          targetId: created.id,
          targetType: "contract",
        });
      }
      setShowCreate(false);
      setEditContract(null);
      loadAll();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  const nameMap = Object.fromEntries(
    [...employers, ...employees].map((p) => [p.uid, p.displayName || p.email]),
  );

  return (
    <Layout>
      <div className="p-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#1B4F72]">
              Contract Management
            </h1>
            <p className="text-gray-500 text-sm mt-0.5">
              Link employers to employees and manage all contract variables
            </p>
          </div>
          <button
            onClick={openNew}
            className="flex items-center gap-2 bg-[#F39C12] hover:bg-[#d68910] text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            + New Contract
          </button>
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

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-[#1B4F72] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : contracts.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
            <div className="text-4xl mb-3">📋</div>
            <h3 className="font-semibold text-gray-700 mb-1">
              No contracts yet
            </h3>
            <p className="text-gray-400 text-sm">
              Create a contract to link an employer with an employee.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">
                    Ref
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">
                    Employer
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">
                    Employee
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">
                    Role / Type
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">
                    Salary
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">
                    Dates
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">
                    CoC
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
                {contracts.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">
                      {c.contractRef || c.id.slice(0, 8)}
                    </td>
                    <td className="px-4 py-3 text-gray-900">
                      {nameMap[c.employerId] || c.employerName || "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-900">
                      {nameMap[c.employeeId] || c.employeeName || "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      <div>{c.employeeRole || "—"}</div>
                      <div className="text-gray-400">{c.type}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-900 text-xs">
                      <div>KES {c.grossSalary?.toLocaleString() || "—"}</div>
                      {c.allowances > 0 && (
                        <div className="text-gray-400">
                          +{c.allowances?.toLocaleString()} allow.
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      <div>Start: {c.startDate || "—"}</div>
                      {c.endDate && <div>End: {c.endDate}</div>}
                      {c.probationEndDate && (
                        <div className="text-amber-600">
                          Prob: {c.probationEndDate}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {c.codeOfConductSigned ? (
                        <span className="text-green-600 text-xs font-medium">
                          ✓ Signed
                        </span>
                      ) : (
                        <span className="text-amber-600 text-xs font-medium">
                          ⏳ Pending
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${c.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}
                      >
                        {c.status || "active"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => openEdit(c)}
                        className="text-[#1B4F72] hover:bg-[#1B4F72]/10 px-3 py-1 rounded text-xs font-medium"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-8">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-[#1B4F72]">
                {editContract ? "Edit Contract" : "New Contract"}
              </h2>
            </div>
            <form
              onSubmit={handleSubmit}
              className="p-6 space-y-6 overflow-y-auto max-h-[80vh]"
            >
              {/* Parties */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <span className="w-5 h-5 bg-[#1B4F72] text-white rounded-full text-xs flex items-center justify-center">
                    1
                  </span>{" "}
                  Parties
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Employer *
                    </label>
                    <select
                      value={form.employerId}
                      onChange={(e) =>
                        setForm({ ...form, employerId: e.target.value })
                      }
                      required
                      className="input-field"
                    >
                      <option value="">Select employer...</option>
                      {employers.map((e) => (
                        <option key={e.uid} value={e.uid}>
                          {e.displayName || e.email}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Employee *
                    </label>
                    <select
                      value={form.employeeId}
                      onChange={(e) =>
                        setForm({ ...form, employeeId: e.target.value })
                      }
                      required
                      className="input-field"
                    >
                      <option value="">Select employee...</option>
                      {employees.map((e) => (
                        <option key={e.uid} value={e.uid}>
                          {e.displayName || e.email}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Contract Ref
                    </label>
                    <input
                      type="text"
                      value={form.contractRef}
                      onChange={(e) =>
                        setForm({ ...form, contractRef: e.target.value })
                      }
                      className="input-field"
                      placeholder="CTR-001"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Employee Role
                    </label>
                    <select
                      value={form.employeeRole}
                      onChange={(e) =>
                        setForm({ ...form, employeeRole: e.target.value })
                      }
                      className="input-field"
                    >
                      <option value="">Select role...</option>
                      {JOB_ROLES.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Contract terms */}
              <div className="border-t border-gray-100 pt-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <span className="w-5 h-5 bg-[#1B4F72] text-white rounded-full text-xs flex items-center justify-center">
                    2
                  </span>{" "}
                  Contract Terms
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
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
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={form.endDate}
                      onChange={(e) =>
                        setForm({ ...form, endDate: e.target.value })
                      }
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Probation End Date
                    </label>
                    <input
                      type="date"
                      value={form.probationEndDate}
                      onChange={(e) =>
                        setForm({ ...form, probationEndDate: e.target.value })
                      }
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Contract Type
                    </label>
                    <select
                      value={form.type}
                      onChange={(e) =>
                        setForm({ ...form, type: e.target.value })
                      }
                      className="input-field"
                    >
                      {CONTRACT_TYPES.map((t) => (
                        <option key={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Employment Location
                    </label>
                    <input
                      type="text"
                      value={form.employmentLocation}
                      onChange={(e) =>
                        setForm({ ...form, employmentLocation: e.target.value })
                      }
                      className="input-field"
                      placeholder="e.g. Karen, Nairobi"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Working Hours / Week
                    </label>
                    <input
                      type="number"
                      value={form.workingHoursPerWeek}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          workingHoursPerWeek: e.target.value,
                        })
                      }
                      className="input-field"
                      min="1"
                      max="84"
                    />
                  </div>
                  <div className="flex items-center gap-3 pt-4">
                    <input
                      type="checkbox"
                      id="coc"
                      checked={form.codeOfConductSigned}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          codeOfConductSigned: e.target.checked,
                        })
                      }
                      className="w-4 h-4 accent-[#1B4F72]"
                    />
                    <label
                      htmlFor="coc"
                      className="text-xs font-medium text-gray-700"
                    >
                      Code of Conduct signed
                    </label>
                  </div>
                </div>
              </div>

              {/* Salary */}
              <div className="border-t border-gray-100 pt-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <span className="w-5 h-5 bg-[#1B4F72] text-white rounded-full text-xs flex items-center justify-center">
                    3
                  </span>{" "}
                  Salary & Allowances (KES)
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Gross Salary
                    </label>
                    <input
                      type="number"
                      value={form.grossSalary}
                      onChange={(e) =>
                        setForm({ ...form, grossSalary: e.target.value })
                      }
                      className="input-field"
                      placeholder="0"
                      min="0"
                      step="1"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Hourly Rate
                    </label>
                    <input
                      type="number"
                      value={form.hourlySalary}
                      onChange={(e) =>
                        setForm({ ...form, hourlySalary: e.target.value })
                      }
                      className="input-field"
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Allowances
                    </label>
                    <input
                      type="number"
                      value={form.allowances}
                      onChange={(e) =>
                        setForm({ ...form, allowances: e.target.value })
                      }
                      className="input-field"
                      placeholder="0"
                      min="0"
                      step="1"
                    />
                  </div>
                </div>
              </div>

              {/* Leave */}
              <div className="border-t border-gray-100 pt-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <span className="w-5 h-5 bg-[#1B4F72] text-white rounded-full text-xs flex items-center justify-center">
                    4
                  </span>{" "}
                  Leave Entitlements (days/year)
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    ["paidLeaveDays", "Paid Leave"],
                    ["sickLeaveDays", "Sick Leave"],
                    ["compassionLeaveDays", "Compassionate"],
                  ].map(([k, l]) => (
                    <div key={k}>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        {l}
                      </label>
                      <input
                        type="number"
                        value={form[k]}
                        onChange={(e) =>
                          setForm({ ...form, [k]: e.target.value })
                        }
                        className="input-field"
                        min="0"
                        max="365"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Multipliers */}
              <div className="border-t border-gray-100 pt-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <span className="w-5 h-5 bg-[#1B4F72] text-white rounded-full text-xs flex items-center justify-center">
                    5
                  </span>{" "}
                  Pay Multipliers
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    ["overtimeMultiplier", "Overtime (×)"],
                    ["holidayMultiplier", "Working on Holiday (×)"],
                  ].map(([k, l]) => (
                    <div key={k}>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        {l}
                      </label>
                      <input
                        type="number"
                        value={form[k]}
                        onChange={(e) =>
                          setForm({ ...form, [k]: e.target.value })
                        }
                        className="input-field"
                        min="1"
                        max="10"
                        step="0.1"
                      />
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  Overtime and Working on Holidays are tracked separately with
                  their own multipliers.
                </p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
                  {error}
                </div>
              )}
              <div className="flex gap-3 pt-2 sticky bottom-0 bg-white pb-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreate(false);
                    setEditContract(null);
                  }}
                  className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg hover:bg-gray-50 font-medium text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-[#1B4F72] text-white py-2.5 rounded-lg hover:bg-[#154360] font-medium text-sm disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : editContract ? (
                    "Update Contract"
                  ) : (
                    "Create Contract"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}

export function ContractManagementLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-[#1B4F72] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
