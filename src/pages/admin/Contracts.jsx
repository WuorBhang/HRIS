import { useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import Layout from "../../components/Layout";
import { db } from "../../lib/firebase";
import { COLLECTIONS, ROLES, CONTRACT_TYPES } from "../../lib/constants";
import { formatDate } from "../../lib/utils";
import { useAuth } from "../../context/AuthContext";
import { AUDIT_ACTIONS, logAction } from "../../lib/audit";

export default function AdminContracts() {
  const { user: adminUser, profile: adminProfile } = useAuth();
  const [contracts, setContracts] = useState([]);
  const [users, setUsers] = useState([]);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    const unsubC = onSnapshot(
      query(
        collection(db, COLLECTIONS.CONTRACTS),
        orderBy("createdAt", "desc"),
      ),
      (s) => setContracts(s.docs.map((d) => ({ id: d.id, ...d.data() }))),
    );
    const unsubU = onSnapshot(
      query(
        collection(db, COLLECTIONS.USERS),
        where("role", "in", [ROLES.EMPLOYER, ROLES.EMPLOYEE]),
      ),
      (s) => setUsers(s.docs.map((d) => ({ id: d.id, ...d.data() }))),
    );
    return () => {
      unsubC();
      unsubU();
    };
  }, []);

  const employers = useMemo(
    () => users.filter((u) => u.role === ROLES.EMPLOYER),
    [users],
  );
  const employees = useMemo(
    () => users.filter((u) => u.role === ROLES.EMPLOYEE),
    [users],
  );
  const userById = useMemo(
    () => Object.fromEntries(users.map((u) => [u.id, u])),
    [users],
  );

  const removeContract = async (id) => {
    if (!confirm("Delete this contract?")) return;
    const c = contracts.find((x) => x.id === id);
    await deleteDoc(doc(db, COLLECTIONS.CONTRACTS, id));
    logAction(
      AUDIT_ACTIONS.CONTRACT_DELETED,
      adminUser?.uid,
      adminProfile?.role,
      {
        contractId: id,
        employerId: c?.employerId,
        employeeId: c?.employeeId,
        employerName: c?.employerName,
        employeeName: c?.employeeName,
      },
    );
  };

  return (
    <Layout>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-primary">
          Contracts
        </h1>
        <button
          onClick={() => setShowCreate(true)}
          disabled={employers.length === 0 || employees.length === 0}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium hover:opacity-90 disabled:opacity-50 w-full sm:w-auto"
          title={
            employers.length === 0 || employees.length === 0
              ? "Create at least one employer and one employee first"
              : ""
          }
        >
          + New contract
        </button>
      </div>

      {contracts.length === 0 ? (
        <div className="bg-card rounded-lg shadow p-6 text-sm text-muted-foreground">
          No contracts yet. Create one to link an employer with an employee.
        </div>
      ) : (
        <>
          {/* Desktop / tablet table */}
          <div className="hidden md:block bg-card rounded-lg shadow overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead className="bg-muted/40 text-left">
                <tr>
                  <th className="p-3">Employer</th>
                  <th className="p-3">Employee</th>
                  <th className="p-3">Role / position</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Start date</th>
                  <th className="p-3">End date</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {contracts.map((c) => (
                  <tr key={c.id} className="border-t border-border">
                    <td className="p-3">
                      {userById[c.employerId]?.fullName || "—"}
                    </td>
                    <td className="p-3">
                      {userById[c.employeeId]?.fullName || "—"}
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {c.position || "—"}
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {c.contractType || "—"}
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {formatDate(c.startDate)}
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {c.endDate ? formatDate(c.endDate) : "—"}
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => removeContract(c.id)}
                        className="text-sm text-destructive underline"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {contracts.map((c) => (
              <div key={c.id} className="bg-card rounded-lg shadow p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="text-xs text-muted-foreground">
                    {formatDate(c.startDate)}
                  </div>
                  <button
                    onClick={() => removeContract(c.id)}
                    className="text-xs text-destructive underline shrink-0"
                  >
                    Delete
                  </button>
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">Employer: </span>
                  <span className="font-medium">
                    {userById[c.employerId]?.fullName || "—"}
                  </span>
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">Employee: </span>
                  <span className="font-medium">
                    {userById[c.employeeId]?.fullName || "—"}
                  </span>
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">Position: </span>
                  <span className="font-medium">{c.position || "—"}</span>
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">End date: </span>
                  <span className="font-medium">
                    {c.endDate ? formatDate(c.endDate) : "Open-ended"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {showCreate && (
        <CreateContractModal
          employers={employers}
          employees={employees}
          onClose={() => setShowCreate(false)}
          adminUser={adminUser}
          adminProfile={adminProfile}
        />
      )}
    </Layout>
  );
}

function CreateContractModal({
  employers,
  employees,
  onClose,
  adminUser,
  adminProfile,
}) {
  const [employerId, setEmployerId] = useState(employers[0]?.id || "");
  const [employeeId, setEmployeeId] = useState(employees[0]?.id || "");
  // Multiple roles per employee — stored as `roles: string[]`. We also keep
  // `position` as the joined string so existing UI that reads c.position
  // (EmployeeDetail, MyEmployees, employer Dashboard) stays compatible.
  const [roles, setRoles] = useState([]);
  const [roleDraft, setRoleDraft] = useState("");
  const [contractType, setContractType] = useState(CONTRACT_TYPES[0]);
  const [startDate, setStartDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [endDate, setEndDate] = useState("");
  const [grossSalary, setGrossSalary] = useState("");
  const [allowances, setAllowances] = useState("");
  const [paidLeave, setPaidLeave] = useState("21");
  const [sickLeave, setSickLeave] = useState("14");
  const [compassionateLeave, setCompassionateLeave] = useState("3");
  const [overtimeMultiplier, setOvertimeMultiplier] = useState("1.5");
  const [holidayMultiplier, setHolidayMultiplier] = useState("2");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Commit any half-typed role in the input as a chip before submitting.
  const finalizeRoles = () => {
    const draft = roleDraft.trim();
    if (!draft) return roles;
    if (roles.includes(draft)) return roles;
    const next = [...roles, draft];
    setRoles(next);
    setRoleDraft("");
    return next;
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!employerId || !employeeId) {
      setError("Select both an employer and an employee.");
      return;
    }
    const finalRoles = finalizeRoles();
    if (finalRoles.length === 0) {
      setError("Add at least one role for the employee.");
      return;
    }
    if (endDate && endDate < startDate) {
      setError("End date cannot be before start date.");
      return;
    }
    setLoading(true);
    try {
      const employer = employers.find((u) => u.id === employerId) || {};
      const employee = employees.find((u) => u.id === employeeId) || {};
      const ref = await addDoc(collection(db, COLLECTIONS.CONTRACTS), {
        employerId,
        employeeId,
        employerName: employer.fullName || "",
        employerEmail: employer.email || "",
        employeeName: employee.fullName || "",
        employeeEmail: employee.email || "",
        employeePhone: employee.phone || "",
        roles: finalRoles,
        // Backwards-compat: `position` is the human-readable summary read by
        // EmployeeDetail / MyEmployees / employer Dashboard.
        position: finalRoles.join(", "),
        contractType,
        startDate: new Date(startDate).toISOString(),
        endDate: endDate ? new Date(endDate).toISOString() : null,
        grossSalary: Number(grossSalary) || 0,
        allowances: Number(allowances) || 0,
        leaveEntitlement: {
          paid: Number(paidLeave) || 0,
          sick: Number(sickLeave) || 0,
          compassionate: Number(compassionateLeave) || 0,
        },
        leaveBalance: {
          paid: Number(paidLeave) || 0,
          sick: Number(sickLeave) || 0,
          compassionate: Number(compassionateLeave) || 0,
        },
        overtimeMultiplier: Number(overtimeMultiplier) || 1,
        holidayMultiplier: Number(holidayMultiplier) || 1,
        createdAt: serverTimestamp(),
      });
      logAction(
        AUDIT_ACTIONS.CONTRACT_CREATED,
        adminUser?.uid,
        adminProfile?.role,
        {
          contractId: ref.id,
          employerId,
          employeeId,
          employerName: employer.fullName || "",
          employeeName: employee.fullName || "",
          roles: finalRoles,
          contractType,
        },
      );
      onClose();
    } catch (err) {
      setError(err.message || "Could not create contract.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-start sm:items-center justify-center px-4 py-6 z-50 overflow-y-auto">
      <div className="bg-card rounded-lg shadow-xl w-full max-w-md p-5 sm:p-6 my-auto">
        <h2 className="text-lg font-semibold text-primary mb-4">
          Link contract
        </h2>

        {error && (
          <div className="mb-3 p-3 rounded-md border border-destructive/40 bg-destructive/10 text-destructive text-sm">
            {error}
          </div>
        )}

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Employer</label>
            <select
              value={employerId}
              onChange={(e) => setEmployerId(e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-border bg-card outline-none focus:ring-2 focus:ring-primary"
              required
            >
              {employers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.fullName} — {u.email}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Employee</label>
            <select
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-border bg-card outline-none focus:ring-2 focus:ring-primary"
              required
            >
              {employees.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.fullName} — {u.email}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Roles{" "}
              <span className="text-xs text-muted-foreground font-normal">
                (one or more)
              </span>
            </label>
            <div className="flex flex-wrap items-center gap-1.5 px-2 py-1.5 rounded-md border border-border bg-card focus-within:ring-2 focus-within:ring-primary">
              {roles.map((r) => (
                <span
                  key={r}
                  className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs font-medium rounded-full pl-2.5 pr-1 py-1"
                >
                  {r}
                  <button
                    type="button"
                    onClick={() =>
                      setRoles((prev) => prev.filter((x) => x !== r))
                    }
                    className="w-4 h-4 rounded-full hover:bg-primary/20 flex items-center justify-center text-primary"
                    aria-label={`Remove ${r}`}
                  >
                    ×
                  </button>
                </span>
              ))}
              <input
                type="text"
                value={roleDraft}
                onChange={(e) => setRoleDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault();
                    finalizeRoles();
                  } else if (
                    e.key === "Backspace" &&
                    !roleDraft &&
                    roles.length > 0
                  ) {
                    setRoles((prev) => prev.slice(0, -1));
                  }
                }}
                onBlur={() => finalizeRoles()}
                placeholder={
                  roles.length === 0 ? "e.g. House Manager, Cook, Driver" : ""
                }
                className="flex-1 min-w-[140px] px-1 py-1 text-sm bg-transparent outline-none"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Press Enter or comma to add each role.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Type</label>
              <select
                value={contractType}
                onChange={(e) => setContractType(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-border bg-card outline-none focus:ring-2 focus:ring-primary"
              >
                {CONTRACT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Start date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-md border border-border bg-card outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              End date{" "}
              <span className="text-xs text-muted-foreground font-normal">
                (optional — leave blank for open-ended)
              </span>
            </label>
            <input
              type="date"
              value={endDate}
              min={startDate || undefined}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-border bg-card outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Gross salary (KES)
              </label>
              <input
                type="number"
                min="0"
                value={grossSalary}
                onChange={(e) => setGrossSalary(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-border bg-card outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Allowances (KES)
              </label>
              <input
                type="number"
                min="0"
                value={allowances}
                onChange={(e) => setAllowances(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-border bg-card outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">
                Paid leave / yr
              </label>
              <input
                type="number"
                min="0"
                value={paidLeave}
                onChange={(e) => setPaidLeave(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-border bg-card outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">
                Sick leave / yr
              </label>
              <input
                type="number"
                min="0"
                value={sickLeave}
                onChange={(e) => setSickLeave(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-border bg-card outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">
                Compassionate / yr
              </label>
              <input
                type="number"
                min="0"
                value={compassionateLeave}
                onChange={(e) => setCompassionateLeave(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-border bg-card outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">
                Overtime multiplier
              </label>
              <input
                type="number"
                step="0.1"
                min="1"
                value={overtimeMultiplier}
                onChange={(e) => setOvertimeMultiplier(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-border bg-card outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">
                Holiday work multiplier
              </label>
              <input
                type="number"
                step="0.1"
                min="1"
                value={holidayMultiplier}
                onChange={(e) => setHolidayMultiplier(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-border bg-card outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-md border border-border hover:bg-muted/30"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-md bg-primary text-primary-foreground font-medium hover:opacity-90 disabled:opacity-50"
            >
              {loading ? "Saving…" : "Create contract"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
