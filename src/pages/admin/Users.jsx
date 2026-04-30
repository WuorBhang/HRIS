import { useEffect, useMemo, useState } from "react";
import {
  collection,
  deleteField,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import {
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
} from "firebase/auth";
import Layout from "../../components/Layout";
import { db, getSecondaryAuth } from "../../lib/firebase";
import {
  COLLECTIONS,
  ROLES,
  STATUS,
  TEMP_PASSWORD_TTL_MS,
} from "../../lib/constants";
import { generateTempPassword, statusLabel } from "../../lib/utils";
import { useAuth } from "../../context/AuthContext";
import { AUDIT_ACTIONS, logAction } from "../../lib/audit";

export default function AdminUsers() {
  const { user: adminUser, profile: adminProfile } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, COLLECTIONS.USERS), orderBy("createdAt", "desc")),
      (snap) => {
        setUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
    );
    return () => unsub();
  }, []);

  // tick every second so countdowns update + auto-purge expired temp passwords
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Auto-clear expired temp passwords from Firestore
  useEffect(() => {
    users.forEach((u) => {
      if (u.tempPassword && u.tempPasswordCreatedAtMs) {
        const elapsed = now - u.tempPasswordCreatedAtMs;
        if (elapsed > TEMP_PASSWORD_TTL_MS) {
          updateDoc(doc(db, COLLECTIONS.USERS, u.id), {
            tempPassword: deleteField(),
            tempPasswordCreatedAtMs: deleteField(),
          }).catch(() => {});
        }
      }
    });
  }, [users, now]);

  const employers = useMemo(
    () => users.filter((u) => u.role === ROLES.EMPLOYER),
    [users],
  );
  const employees = useMemo(
    () => users.filter((u) => u.role === ROLES.EMPLOYEE),
    [users],
  );

  const approve = async (u) => {
    await updateDoc(doc(db, COLLECTIONS.USERS, u.id), {
      status: STATUS.APPROVED,
      approvedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    logAction(AUDIT_ACTIONS.USER_APPROVED, adminUser?.uid, adminProfile?.role, {
      targetUserId: u.id,
      targetEmail: u.email,
      targetRole: u.role,
    });
  };

  const toggleDisable = async (u) => {
    const wasDisabled = u.status === STATUS.DISABLED;
    await updateDoc(doc(db, COLLECTIONS.USERS, u.id), {
      status: wasDisabled ? STATUS.APPROVED : STATUS.DISABLED,
      updatedAt: serverTimestamp(),
    });
    logAction(
      wasDisabled ? AUDIT_ACTIONS.USER_REENABLED : AUDIT_ACTIONS.USER_DISABLED,
      adminUser?.uid,
      adminProfile?.role,
      { targetUserId: u.id, targetEmail: u.email, targetRole: u.role },
    );
  };

  return (
    <Layout>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-primary">
          User management
        </h1>
        <button
          onClick={() => setShowCreate(true)}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium hover:opacity-90 w-full sm:w-auto"
        >
          + Create user
        </button>
      </div>

      {loading ? (
        <div className="text-muted-foreground">Loading…</div>
      ) : (
        <>
          <UserSection
            title="Employers"
            users={employers}
            now={now}
            onApprove={approve}
            onToggleDisable={toggleDisable}
          />
          <UserSection
            title="Employees"
            users={employees}
            now={now}
            onApprove={approve}
            onToggleDisable={toggleDisable}
          />
        </>
      )}

      {showCreate && (
        <CreateUserModal
          onClose={() => setShowCreate(false)}
          adminUser={adminUser}
          adminProfile={adminProfile}
        />
      )}
    </Layout>
  );
}

function UserSection({ title, users, now, onApprove, onToggleDisable }) {
  return (
    <section className="mb-8">
      <h2 className="text-lg font-semibold text-primary mb-3">
        {title}{" "}
        <span className="text-muted-foreground text-sm">({users.length})</span>
      </h2>
      {users.length === 0 ? (
        <div className="bg-card rounded-lg shadow p-5 text-sm text-muted-foreground">
          No {title.toLowerCase()} yet.
        </div>
      ) : (
        <>
          {/* Desktop / tablet table */}
          <div className="hidden md:block bg-card rounded-lg shadow overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead className="bg-muted/40 text-left">
                <tr>
                  <th className="p-3">Name</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Phone</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Last login</th>
                  <th className="p-3">Temp password</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <UserRow
                    key={u.id}
                    user={u}
                    now={now}
                    onApprove={onApprove}
                    onToggleDisable={onToggleDisable}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {users.map((u) => (
              <UserCard
                key={u.id}
                user={u}
                now={now}
                onApprove={onApprove}
                onToggleDisable={onToggleDisable}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function UserRow({ user, now, onApprove, onToggleDisable }) {
  const [copied, setCopied] = useState(false);

  let tempBlock = <span className="text-muted-foreground">—</span>;
  if (user.tempPassword && user.tempPasswordCreatedAtMs) {
    const remaining = Math.max(
      0,
      Math.ceil(
        (TEMP_PASSWORD_TTL_MS - (now - user.tempPasswordCreatedAtMs)) / 1000,
      ),
    );
    if (remaining > 0) {
      const credentials = `Email: ${user.email}\nPassword: ${user.tempPassword}`;
      tempBlock = (
        <div className="flex items-center gap-2">
          <code className="bg-muted/40 px-2 py-1 rounded font-mono text-xs">
            {user.tempPassword}
          </code>
          <button
            onClick={async () => {
              await navigator.clipboard.writeText(credentials);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
            className="text-xs text-primary underline"
            title="Copy email and password"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
          <span className="text-xs text-accent font-medium">{remaining}s</span>
        </div>
      );
    }
  }

  return (
    <tr className="border-t border-border">
      <td className="p-3 font-medium">{user.fullName || "—"}</td>
      <td className="p-3 text-muted-foreground">{user.email}</td>
      <td className="p-3 text-muted-foreground">{user.phone || "—"}</td>
      <td className="p-3">
        <StatusBadge status={user.status} />
      </td>
      <td className="p-3 text-xs text-muted-foreground whitespace-nowrap">
        {fmtLastLogin(user.lastLoginAt)}
      </td>
      <td className="p-3">{tempBlock}</td>
      <td className="p-3 text-right whitespace-nowrap">
        {user.status === STATUS.PENDING && (
          <button
            onClick={() => onApprove(user)}
            className="text-sm bg-green-600 text-white px-3 py-1 rounded hover:opacity-90 mr-2"
          >
            Approve
          </button>
        )}
        {user.status !== STATUS.PENDING && (
          <button
            onClick={() => onToggleDisable(user)}
            className="text-sm border border-border px-3 py-1 rounded hover:bg-muted/30"
          >
            {user.status === STATUS.DISABLED ? "Enable" : "Disable"}
          </button>
        )}
      </td>
    </tr>
  );
}

function UserCard({ user, now, onApprove, onToggleDisable }) {
  const [copied, setCopied] = useState(false);

  let tempBlock = null;
  if (user.tempPassword && user.tempPasswordCreatedAtMs) {
    const remaining = Math.max(
      0,
      Math.ceil(
        (TEMP_PASSWORD_TTL_MS - (now - user.tempPasswordCreatedAtMs)) / 1000,
      ),
    );
    if (remaining > 0) {
      const credentials = `Email: ${user.email}\nPassword: ${user.tempPassword}`;
      tempBlock = (
        <div className="mt-3 p-3 rounded-md bg-muted/40 border border-border">
          <div className="text-xs text-muted-foreground mb-1">
            Temp password
          </div>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <code className="font-mono text-sm break-all">
              {user.tempPassword}
            </code>
            <span className="text-xs text-accent font-medium">
              {remaining}s left
            </span>
          </div>
          <button
            onClick={async () => {
              await navigator.clipboard.writeText(credentials);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
            className="mt-2 text-xs text-primary underline"
          >
            {copied ? "Copied!" : "Copy email & password"}
          </button>
        </div>
      );
    }
  }

  return (
    <div className="bg-card rounded-lg shadow p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="font-semibold truncate">{user.fullName || "—"}</div>
          <div className="text-sm text-muted-foreground break-all">
            {user.email}
          </div>
          {user.phone && (
            <div className="text-sm text-muted-foreground mt-0.5">
              {user.phone}
            </div>
          )}
          <div className="text-xs text-muted-foreground mt-1">
            Last login: {fmtLastLogin(user.lastLoginAt)}
          </div>
        </div>
        <StatusBadge status={user.status} />
      </div>

      {tempBlock}

      <div className="mt-3 flex flex-wrap gap-2">
        {user.status === STATUS.PENDING && (
          <button
            onClick={() => onApprove(user)}
            className="text-sm bg-green-600 text-white px-3 py-1.5 rounded hover:opacity-90"
          >
            Approve
          </button>
        )}
        {user.status !== STATUS.PENDING && (
          <button
            onClick={() => onToggleDisable(user)}
            className="text-sm border border-border px-3 py-1.5 rounded hover:bg-muted/30"
          >
            {user.status === STATUS.DISABLED ? "Enable" : "Disable"}
          </button>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const styles = {
    [STATUS.PENDING]: "bg-accent/20 text-accent",
    [STATUS.APPROVED]: "bg-blue-100 text-blue-700",
    [STATUS.ACTIVE]: "bg-green-100 text-green-700",
    [STATUS.DISABLED]: "bg-destructive/20 text-destructive",
  };
  return (
    <span className={`text-xs px-2 py-1 rounded-full ${styles[status] || ""}`}>
      {statusLabel(status)}
    </span>
  );
}

function fmtLastLogin(ts) {
  const ms = ts?.toMillis?.();
  if (!ms) return "Never";
  const d = new Date(ms);
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function CreateUserModal({ onClose, adminUser, adminProfile }) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState(ROLES.EMPLOYEE);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const tempPassword = generateTempPassword();
      const secondaryAuth = getSecondaryAuth();
      const cred = await createUserWithEmailAndPassword(
        secondaryAuth,
        email.trim(),
        tempPassword,
      );
      const uid = cred.user.uid;

      await setDoc(doc(db, COLLECTIONS.USERS, uid), {
        uid,
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        role,
        status: STATUS.PENDING,
        mustChangePassword: true,
        tempPassword,
        tempPasswordCreatedAtMs: Date.now(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Sign out the secondary instance so admin's session is untouched
      await fbSignOut(secondaryAuth);

      logAction(
        AUDIT_ACTIONS.ACCOUNT_CREATED,
        adminUser?.uid,
        adminProfile?.role,
        {
          targetUserId: uid,
          targetEmail: email.trim(),
          targetFullName: fullName.trim(),
          targetRole: role,
        },
      );

      onClose();
    } catch (err) {
      if (err.code === "auth/email-already-in-use") {
        setError("That email is already in use.");
      } else if (err.code === "auth/invalid-email") {
        setError("Please enter a valid email address.");
      } else {
        setError(err.message || "Could not create user.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-start sm:items-center justify-center px-4 py-6 z-50 overflow-y-auto">
      <div className="bg-card rounded-lg shadow-xl w-full max-w-md p-5 sm:p-6 my-auto">
        <h2 className="text-lg font-semibold text-primary mb-1">Create user</h2>
        <p className="text-sm text-muted-foreground mb-4">
          A temporary password will be generated and shown on the dashboard for
          60 seconds.
        </p>

        {error && (
          <div className="mb-3 p-3 rounded-md border border-destructive/40 bg-destructive/10 text-destructive text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-border bg-card outline-none focus:ring-2 focus:ring-primary"
            >
              <option value={ROLES.EMPLOYER}>Employer</option>
              <option value={ROLES.EMPLOYEE}>Employee</option>
            </select>
          </div>
          <Input
            label="Full name"
            value={fullName}
            onChange={setFullName}
            required
          />
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={setEmail}
            required
          />
          <Input
            label="Phone"
            value={phone}
            onChange={setPhone}
            placeholder="+254 7XX XXX XXX"
          />

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
              {loading ? "Creating…" : "Create user"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
  required,
  placeholder,
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded-md border border-border bg-card outline-none focus:ring-2 focus:ring-primary"
      />
    </div>
  );
}
