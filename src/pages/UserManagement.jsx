import { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  doc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../context/AuthContext";
import Layout from "../components/Layout";

const ROLES = ["employer", "it-expert", "user"];
const ROLE_STYLE = {
  admin: "bg-red-100 text-red-700",
  "it-expert": "bg-purple-100 text-purple-700",
  employer: "bg-blue-100 text-blue-700",
  user: "bg-gray-100 text-gray-600",
};

export default function UserManagement() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    email: "",
    displayName: "",
    role: "employer",
    companyName: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [createdAccount, setCreatedAccount] = useState(null); // { email, tempPassword, emailSent, emailError }

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, "userProfiles"));
      setUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (e) {
      setError("Failed to load users: " + e.message);
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
          companyName: u.companyName,
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

  async function handleCreateUser(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccessMsg("");

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
          companyName: form.companyName,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create account");

      await setDoc(doc(collection(db, "userProfiles")), {
        email: form.email,
        displayName: form.displayName,
        role: form.role,
        companyName: form.companyName,
        uid: data.uid,
        createdBy: user.uid,
        createdAt: serverTimestamp(),
        status: "active",
        emailSent: data.emailSent,
      });

      setCreatedAccount({
        email: form.email,
        displayName: form.displayName,
        tempPassword: data.tempPassword,
        emailSent: data.emailSent,
        emailError: data.emailError,
      });

      setForm({
        email: "",
        displayName: "",
        role: "employer",
        companyName: "",
      });
      setShowForm(false);
      fetchUsers();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Layout>
      <div className="p-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#1B4F72]">
              User Management
            </h1>
            <p className="text-gray-500 text-sm mt-0.5">
              Create accounts and assign roles — admin only
            </p>
          </div>
          <button
            onClick={() => {
              setShowForm(true);
              setError("");
              setSuccessMsg("");
              setCreatedAccount(null);
            }}
            className="flex items-center gap-2 bg-[#F39C12] hover:bg-[#d68910] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
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
                d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
              />
            </svg>
            Create Account
          </button>
        </div>

        {/* Account Created Banner */}
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
                    A welcome email with login credentials was sent
                    successfully.
                  </p>
                ) : (
                  <>
                    <p className="text-amber-700 text-sm mt-1">
                      Email delivery failed ({createdAccount.emailError}). Share
                      these credentials manually:
                    </p>
                    <div className="mt-3 bg-white border border-amber-200 rounded-lg p-3 space-y-1 text-sm font-mono">
                      <div>
                        <span className="text-gray-500">Email: </span>
                        <span className="font-semibold text-gray-900 select-all">
                          {createdAccount.email}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Password: </span>
                        <span className="font-semibold text-gray-900 select-all">
                          {createdAccount.tempPassword}
                        </span>
                      </div>
                    </div>
                    <p className="text-amber-600 text-xs mt-2">
                      ⚙️ To fix email delivery: verify your sender address in
                      SendGrid under Settings → Sender Authentication, then
                      update the <code>SENDGRID_FROM_EMAIL</code> secret to a
                      verified sender.
                    </p>
                  </>
                )}
                <button
                  onClick={() => setCreatedAccount(null)}
                  className="mt-2 text-xs underline text-gray-500 hover:text-gray-700"
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

        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6 text-sm text-blue-800">
          <strong>How it works:</strong> Creating an account calls a server-side
          API that creates the Firebase Auth user, assigns the role as a secure
          Custom Claim (not a Firestore field — prevents privilege escalation),
          and sends a branded welcome email via SendGrid. The API key never
          reaches the browser.
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-[#1B4F72] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : users.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
            <div className="text-4xl mb-3">👤</div>
            <h3 className="font-semibold text-gray-700 mb-1">
              No accounts created yet
            </h3>
            <p className="text-gray-400 text-sm">
              Create the first employer account using the button above.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
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
                      Company
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">
                      Status
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">
                      Welcome Email
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">
                          {u.displayName || "—"}
                        </div>
                        <div className="text-gray-400 text-xs">{u.email}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_STYLE[u.role] || ROLE_STYLE.user}`}
                        >
                          {u.role || "user"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {u.companyName || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          {u.status || "active"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {u.emailSent === true ? (
                          <span className="text-green-600 text-xs font-medium">
                            ✓ Delivered
                          </span>
                        ) : u.emailSent === false ? (
                          <button
                            onClick={() => handleResetCredentials(u)}
                            className="text-amber-600 text-xs font-medium underline hover:text-amber-700"
                            title="Click to reset password and retry email"
                          >
                            ⚠ Failed — Reset
                          </button>
                        ) : (
                          <span className="text-gray-400 text-xs">—</span>
                        )}
                      </td>
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
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-[#1B4F72]">
                Create User Account
              </h2>
              <p className="text-gray-500 text-sm mt-1">
                A welcome email with login credentials will be sent
                automatically
              </p>
            </div>
            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                  className="input-field"
                  placeholder="employer@company.com"
                />
              </div>
              <div>
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company Name
                </label>
                <input
                  type="text"
                  value={form.companyName}
                  onChange={(e) =>
                    setForm({ ...form, companyName: e.target.value })
                  }
                  className="input-field"
                  placeholder="Acme Corp"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role *
                </label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="input-field"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r === "it-expert"
                        ? "IT Expert"
                        : r.charAt(0).toUpperCase() + r.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 text-xs text-amber-700">
                A secure temporary password will be auto-generated. If email
                delivery fails, the password will be shown here so you can share
                it manually.
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
