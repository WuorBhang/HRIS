import { useState, useEffect } from "react";
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../context/AuthContext";
import Layout from "../components/Layout";

const STATUS_OPTIONS = ["active", "inactive"];
const DEPT_OPTIONS = [
  "Engineering",
  "HR",
  "Finance",
  "Marketing",
  "Operations",
  "Sales",
  "Legal",
  "IT",
  "Other",
];

const EMPTY_FORM = {
  fullName: "",
  nationalId: "",
  jobTitle: "",
  department: "",
  startDate: "",
  employmentStatus: "active",
  email: "",
};

export default function Employees() {
  const { user, role } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null);

  const canWrite = ["admin", "it-expert", "employer"].includes(role);
  const canDelete = ["admin", "employer"].includes(role);

  useEffect(() => {
    fetchEmployees();
  }, [user]);

  async function fetchEmployees() {
    setLoading(true);
    try {
      let q;
      if (role === "admin" || role === "it-expert") {
        q = query(collection(db, "employees"));
      } else {
        q = query(
          collection(db, "employees"),
          where("employerId", "==", user.uid),
        );
      }
      const snap = await getDocs(q);
      setEmployees(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (e) {
      setError("Failed to load employees: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  function openAdd() {
    setForm(EMPTY_FORM);
    setEditing(null);
    setShowForm(true);
    setError("");
  }

  function openEdit(emp) {
    setForm({
      fullName: emp.fullName || "",
      nationalId: emp.nationalId || "",
      jobTitle: emp.jobTitle || "",
      department: emp.department || "",
      startDate: emp.startDate || "",
      employmentStatus: emp.employmentStatus || "active",
      email: emp.email || "",
    });
    setEditing(emp);
    setShowForm(true);
    setError("");
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      if (editing) {
        await updateDoc(doc(db, "employees", editing.id), {
          ...form,
          updatedAt: serverTimestamp(),
        });
      } else {
        await addDoc(collection(db, "employees"), {
          ...form,
          employerId: user.uid,
          email: form.email || "",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      setShowForm(false);
      fetchEmployees();
    } catch (e) {
      setError("Failed to save: " + e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    try {
      await deleteDoc(doc(db, "employees", id));
      setConfirmDelete(null);
      fetchEmployees();
    } catch (e) {
      setError("Failed to delete: " + e.message);
    }
  }

  const filtered = employees.filter(
    (e) =>
      e.fullName?.toLowerCase().includes(search.toLowerCase()) ||
      e.jobTitle?.toLowerCase().includes(search.toLowerCase()) ||
      e.department?.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <Layout>
      <div className="p-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#1B4F72]">Employees</h1>
            <p className="text-gray-500 text-sm mt-0.5">
              {employees.length} total employee
              {employees.length !== 1 ? "s" : ""}
            </p>
          </div>
          {canWrite && (
            <button
              onClick={openAdd}
              className="flex items-center gap-2 bg-[#1B4F72] hover:bg-[#154360] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Add Employee
            </button>
          )}
        </div>

        <div className="mb-4">
          <input
            type="search"
            placeholder="Search by name, title, or department..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B4F72] text-sm"
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm mb-4">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-[#1B4F72] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
            <div className="text-4xl mb-3">👥</div>
            <h3 className="font-semibold text-gray-700 mb-1">
              {search ? "No employees found" : "No employees yet"}
            </h3>
            <p className="text-gray-400 text-sm">
              {canWrite && !search
                ? 'Click "Add Employee" to create your first employee record.'
                : "Try adjusting your search."}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">
                      Name
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">
                      National ID
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">
                      Job Title
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">
                      Department
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">
                      Email
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">
                      Start Date
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">
                      Status
                    </th>
                    {canWrite && (
                      <th className="text-right px-4 py-3 font-semibold text-gray-600">
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map((emp) => (
                    <tr
                      key={emp.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 bg-[#1B4F72]/10 rounded-full flex items-center justify-center text-[#1B4F72] font-semibold text-xs">
                            {emp.fullName?.[0]?.toUpperCase() || "?"}
                          </div>
                          <span className="font-medium text-gray-900">
                            {emp.fullName}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {emp.nationalId || "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {emp.jobTitle || "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {emp.department || "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-600 truncate max-w-[200px]">
                        {emp.email || "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {emp.startDate || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            emp.employmentStatus === "active"
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {emp.employmentStatus === "active"
                            ? "Active"
                            : "Inactive"}
                        </span>
                      </td>
                      {canWrite && (
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => openEdit(emp)}
                              className="text-[#1B4F72] hover:bg-[#1B4F72]/10 px-2 py-1 rounded text-xs font-medium transition-colors"
                            >
                              Edit
                            </button>
                            {canDelete && (
                              <button
                                onClick={() => setConfirmDelete(emp)}
                                className="text-red-500 hover:bg-red-50 px-2 py-1 rounded text-xs font-medium transition-colors"
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-[#1B4F72]">
                {editing ? "Edit Employee" : "Add New Employee"}
              </h2>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <FormField label="Full Name *" required>
                <input
                  type="text"
                  value={form.fullName}
                  onChange={(e) =>
                    setForm({ ...form, fullName: e.target.value })
                  }
                  required
                  className="input-field"
                  placeholder="e.g. Jane Doe"
                />
              </FormField>
              <FormField label="National ID *" required>
                <input
                  type="text"
                  value={form.nationalId}
                  onChange={(e) =>
                    setForm({ ...form, nationalId: e.target.value })
                  }
                  required
                  className="input-field"
                  placeholder="e.g. 1234567890"
                />
              </FormField>
              <FormField label="Job Title *" required>
                <input
                  type="text"
                  value={form.jobTitle}
                  onChange={(e) =>
                    setForm({ ...form, jobTitle: e.target.value })
                  }
                  required
                  className="input-field"
                  placeholder="e.g. Software Engineer"
                />
              </FormField>
              <FormField label="Employee Email *" required>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                  className="input-field"
                  placeholder="e.g. jane.doe@company.com"
                />
              </FormField>
              <FormField label="Department *" required>
                <select
                  value={form.department}
                  onChange={(e) =>
                    setForm({ ...form, department: e.target.value })
                  }
                  required
                  className="input-field"
                >
                  <option value="">Select department</option>
                  {DEPT_OPTIONS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Start Date *" required>
                <input
                  type="date"
                  value={form.startDate}
                  onChange={(e) =>
                    setForm({ ...form, startDate: e.target.value })
                  }
                  required
                  className="input-field"
                />
              </FormField>
              <FormField label="Employment Status">
                <select
                  value={form.employmentStatus}
                  onChange={(e) =>
                    setForm({ ...form, employmentStatus: e.target.value })
                  }
                  className="input-field"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </option>
                  ))}
                </select>
              </FormField>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
                  {error}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg hover:bg-gray-50 font-medium text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-[#1B4F72] text-white py-2.5 rounded-lg hover:bg-[#154360] font-medium text-sm disabled:opacity-60"
                >
                  {saving
                    ? "Saving..."
                    : editing
                      ? "Save Changes"
                      : "Add Employee"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              Delete Employee
            </h3>
            <p className="text-gray-500 text-sm mb-6">
              Are you sure you want to delete{" "}
              <strong>{confirmDelete.fullName}</strong>? This action cannot be
              undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-50 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(confirmDelete.id)}
                className="flex-1 bg-red-500 text-white py-2 rounded-lg hover:bg-red-600 text-sm font-medium"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

function FormField({ label, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      {children}
    </div>
  );
}
