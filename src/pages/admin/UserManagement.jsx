import { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  doc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useAuth } from "../../context/AuthContext";
import { logAudit } from "../../services/auditService";
import Layout from "../../components/Layout";

const ROLES = ["employer", "employee"];
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

const ROLE_STYLE = {
  admin: "bg-red-100 text-red-700",
  "it-expert": "bg-purple-100 text-purple-700",
  employer: "bg-blue-100 text-blue-700",
  employee: "bg-green-100 text-green-700",
  user: "bg-gray-100 text-gray-600",
};

const EMPTY_FORM = {
  email: "",
  displayName: "",
  role: "employer",
  phone: "",
  whatsapp: "",
  address: "",
  kraPin: "",
  companyName: "",
  tier: "basic",
  subscriptionStatus: "active",
  jobRoles: [],
};

export default function UserManagement() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [createdAccount, setCreatedAccount] = useState(null);
  const [activating, setActivating] = useState("");
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, "userProfiles"));
      setUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (e) {
      setError("Failed to load: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleResetCredentials(u) {
    setCreatedAccount(null);
    setError("");
    try {
      const res = await fetch("/api/admin/reset-credentials", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-secret": "hris-internal-2026",
        },
        body: JSON.stringify({
          email: u.email,
          displayName: u.displayName,
          role: u.role,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Reset failed");
      setCreatedAccount({
        email: u.email,
        displayName: u.displayName,
        tempPassword: data.tempPassword,
        emailSent: data.emailSent,
        emailError: data.emailError,
      });
    } catch (e) {
      setError("Reset failed: " + e.message);
    }
  }

  async function handleToggleActivation(u) {
    setActivating(u.uid || u.id);
    try {
      const newActivated = !u.activated;
      await fetch("/api/admin/activate-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-secret": "hris-internal-2026",
        },
        body: JSON.stringify({ uid: u.uid, activated: newActivated }),
      });
      const profileDoc = users.find((x) => x.uid === u.uid);
      if (profileDoc)
        await updateDoc(doc(db, "userProfiles", profileDoc.id), {
          activated: newActivated,
        });
      await logAudit({
        action: newActivated ? "activate_user" : "deactivate_user",
        userId: user.uid,
        userEmail: user.email,
        targetId: u.uid,
        targetType: "user",
      });
      fetchUsers();
    } catch (e) {
      setError("Activation failed: " + e.message);
    } finally {
      setActivating("");
    }
  }

  function toggleJobRole(role) {
    setForm((prev) => ({
      ...prev,
      jobRoles: prev.jobRoles.includes(role)
        ? prev.jobRoles.filter((r) => r !== role)
        : [...prev.jobRoles, role],
    }));
  }

  async function handleCreateUser(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setCreatedAccount(null);
    try {
      const res = await fetch("/api/admin/create-employer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-secret": "hris-internal-2026",
        },
        body: JSON.stringify({
          email: form.email,
          displayName: form.displayName,
          role: form.role,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create account");

      const profileData = {
        email: form.email,
        displayName: form.displayName,
        role: form.role,
        phone: form.phone,
        whatsapp: form.whatsapp,
        address: form.address,
        kraPin: form.kraPin,
        uid: data.uid,
        createdBy: user.uid,
        createdAt: serverTimestamp(),
        activated: false,
        emailSent: data.emailSent,
      };

      if (form.role === "employer") {
        profileData.companyName = form.companyName;
        profileData.tier = form.tier;
        profileData.subscriptionStatus = form.subscriptionStatus;
      } else if (form.role === "employee") {
        profileData.jobRoles = form.jobRoles;
        profileData.employmentStatus = "employed";
      }

      await setDoc(doc(collection(db, "userProfiles")), profileData);
      await logAudit({
        action: "create_account",
        userId: user.uid,
        userEmail: user.email,
        targetId: data.uid,
        targetType: "user",
        details: { role: form.role },
      });
      setCreatedAccount({
        email: form.email,
        displayName: form.displayName,
        tempPassword: data.tempPassword,
        emailSent: data.emailSent,
        emailError: data.emailError,
      });
      setForm(EMPTY_FORM);
      setShowForm(false);
      fetchUsers();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  const filteredUsers =
    filter === "all" ? users : users.filter((u) => u.role === filter);

  return (
    <Layout>
      <div className="p-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#1B4F72]">
              User Management
            </h1>
            <p className="text-gray-500 text-sm mt-0.5">
              Create and manage employer and employee accounts
            </p>
          </div>
          <button
            onClick={() => {
              setShowForm(true);
              setError("");
              setCreatedAccount(null);
              setForm(EMPTY_FORM);
            }}
            className="flex items-center gap-2 bg-[#F39C12] hover:bg-[#d68910] text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            + Create Account
          </button>
        </div>

        {createdAccount && (
          <div
            className={`rounded-xl p-5 mb-5 border ${createdAccount.emailSent ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"}`}
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl">
                {createdAccount.emailSent ? "✅" : "⚠️"}
              </span>
              <div className="flex-1">
                <p
                  className={`font-semibold ${createdAccount.emailSent ? "text-green-800" : "text-amber-800"}`}
                >
                  Account created for {createdAccount.email}
                </p>
                {createdAccount.emailSent ? (
                  <p className="text-green-700 text-sm mt-1">
                    Welcome email sent successfully.
                  </p>
                ) : (
                  <>
                    <p className="text-amber-700 text-sm mt-1">
                      Email failed. Share credentials manually:
                    </p>
                    <div className="mt-3 bg-white border border-amber-200 rounded-lg p-3 space-y-1 text-sm font-mono">
                      <div>
                        <span className="text-gray-500">Email: </span>
                        <span className="font-semibold select-all">
                          {createdAccount.email}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Password: </span>
                        <span className="font-semibold select-all">
                          {createdAccount.tempPassword}
                        </span>
                      </div>
                    </div>
                  </>
                )}
                <button
                  onClick={() => setCreatedAccount(null)}
                  className="mt-2 text-xs underline text-gray-500"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm mb-4">
            {error}
          </div>
        )}

        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-5 text-sm text-blue-800">
          <strong>Activation gate:</strong> New accounts are <em>pending</em> by
          default. Activate after contract variables are fully entered.
        </div>

        <div className="flex gap-2 mb-4 flex-wrap">
          {["all", "employer", "employee"].map((r) => (
            <button
              key={r}
              onClick={() => setFilter(r)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filter === r ? "bg-[#1B4F72] text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"}`}
            >
              {r === "all"
                ? "All Users"
                : r.charAt(0).toUpperCase() + r.slice(1)}
              {r !== "all" && ` (${users.filter((u) => u.role === r).length})`}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-[#1B4F72] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
            <div className="text-4xl mb-3">👤</div>
            <h3 className="font-semibold text-gray-700 mb-1">
              No accounts yet
            </h3>
            <p className="text-gray-400 text-sm">
              Create the first account using the button above.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">
                    Name / Email
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">
                    Role
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">
                    Contact
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">
                    KRA PIN
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">
                    Activation
                  </th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">
                        {u.displayName || "—"}
                      </div>
                      <div className="text-gray-400 text-xs">{u.email}</div>
                      {u.companyName && (
                        <div className="text-gray-400 text-xs">
                          {u.companyName}
                        </div>
                      )}
                      {u.jobRoles?.length > 0 && (
                        <div className="text-gray-400 text-xs">
                          {u.jobRoles.join(", ")}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_STYLE[u.role] || ROLE_STYLE.user}`}
                      >
                        {u.role || "user"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      {u.phone && <div>📞 {u.phone}</div>}
                      {u.whatsapp && <div>💬 {u.whatsapp}</div>}
                      {u.address && (
                        <div className="text-gray-400 truncate max-w-[120px]">
                          {u.address}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-gray-600">
                      {u.kraPin || "—"}
                    </td>
                    <td className="px-4 py-3">
                      {["employer", "employee"].includes(u.role) ? (
                        <button
                          onClick={() => handleToggleActivation(u)}
                          disabled={activating === (u.uid || u.id)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                            u.activated !== false
                              ? "bg-green-100 text-green-700 hover:bg-green-200"
                              : "bg-amber-100 text-amber-700 hover:bg-amber-200"
                          } disabled:opacity-50`}
                        >
                          {activating === (u.uid || u.id)
                            ? "..."
                            : u.activated !== false
                              ? "✓ Active"
                              : "⏳ Pending"}
                        </button>
                      ) : (
                        <span className="text-gray-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleResetCredentials(u)}
                        className="text-[#1B4F72] hover:bg-[#1B4F72]/10 px-3 py-1 rounded text-xs font-medium"
                      >
                        Reset PW
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg my-8">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-[#1B4F72]">
                Create Account
              </h2>
              <p className="text-gray-500 text-sm mt-1">
                Creates Firebase Auth account and sends welcome email
              </p>
            </div>
            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Account Type *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {ROLES.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setForm({ ...form, role: r })}
                      className={`py-2.5 rounded-lg border text-sm font-medium transition-colors ${form.role === r ? "bg-[#1B4F72] text-white border-[#1B4F72]" : "border-gray-200 text-gray-700 hover:bg-gray-50"}`}
                    >
                      {r === "employer" ? "🏠 Employer" : "👤 Employee"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={form.displayName}
                    onChange={(e) =>
                      setForm({ ...form, displayName: e.target.value })
                    }
                    className="input-field"
                    placeholder="Jane Doe"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) =>
                      setForm({ ...form, email: e.target.value })
                    }
                    required
                    className="input-field"
                    placeholder="user@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone / WhatsApp
                  </label>
                  <input
                    type="tel"
                    value={form.whatsapp}
                    onChange={(e) =>
                      setForm({ ...form, whatsapp: e.target.value })
                    }
                    className="input-field"
                    placeholder="+254..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    KRA PIN
                  </label>
                  <input
                    type="text"
                    value={form.kraPin}
                    onChange={(e) =>
                      setForm({ ...form, kraPin: e.target.value })
                    }
                    className="input-field"
                    placeholder="A123456789B"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address
                  </label>
                  <input
                    type="text"
                    value={form.address}
                    onChange={(e) =>
                      setForm({ ...form, address: e.target.value })
                    }
                    className="input-field"
                    placeholder="Area, City, County"
                  />
                </div>
              </div>

              {form.role === "employer" && (
                <div className="border-t border-gray-100 pt-4 space-y-4">
                  <h3 className="text-sm font-semibold text-gray-700">
                    Employer Details
                  </h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Company / Household Name
                    </label>
                    <input
                      type="text"
                      value={form.companyName}
                      onChange={(e) =>
                        setForm({ ...form, companyName: e.target.value })
                      }
                      className="input-field"
                      placeholder="Household / Company name"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tier
                      </label>
                      <select
                        value={form.tier}
                        onChange={(e) =>
                          setForm({ ...form, tier: e.target.value })
                        }
                        className="input-field"
                      >
                        {["basic", "standard", "premium"].map((t) => (
                          <option key={t} value={t}>
                            {t.charAt(0).toUpperCase() + t.slice(1)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Subscription
                      </label>
                      <select
                        value={form.subscriptionStatus}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            subscriptionStatus: e.target.value,
                          })
                        }
                        className="input-field"
                      >
                        {["active", "trial", "suspended", "cancelled"].map(
                          (s) => (
                            <option key={s} value={s}>
                              {s.charAt(0).toUpperCase() + s.slice(1)}
                            </option>
                          ),
                        )}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {form.role === "employee" && (
                <div className="border-t border-gray-100 pt-4 space-y-3">
                  <h3 className="text-sm font-semibold text-gray-700">
                    Job Roles
                  </h3>
                  <p className="text-xs text-gray-500">
                    Select all applicable roles for this worker
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {JOB_ROLES.map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => toggleJobRole(r)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${form.jobRoles.includes(r) ? "bg-[#1B4F72] text-white border-[#1B4F72]" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 text-xs text-amber-700">
                Account will be created as <strong>Pending</strong> — activate
                after entering contract variables.
              </div>

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
                  className="flex-1 bg-[#F39C12] text-white py-2.5 rounded-lg hover:bg-[#d68910] font-medium text-sm disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Account"
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

export function UserManagementLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-[#1B4F72] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
