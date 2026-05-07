// Admin user management: create / approve / disable / re-enable.
import { useEffect, useMemo, useState } from "react";
import {
  collection,
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
import { Copy, UserPlus, Pencil } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { db, getSecondaryAuth } from "../../lib/firebase";
import {
  COLLECTIONS,
  ROLES,
  STATUS,
  TEMP_PASSWORD_TTL_MS,
  EMPLOYER_TIERS,
  DEFAULT_EMPLOYER_TIER,
  SUBSCRIPTION_STATUS_OPTIONS,
  SUBSCRIPTION_STATUS_LABELS,
  DEFAULT_SUBSCRIPTION_STATUS,
} from "../../lib/constants";
import { generateTempPassword, statusLabel } from "../../lib/utils";
import { AUDIT, logAction } from "../../lib/audit";
import {
  Input,
  Textarea,
  Select,
  Button,
  Alert,
  Card,
  PageHeader,
  Modal,
} from "../../lib/ui";
import Layout from "../../components/Layout";
import Avatar from "../../components/Avatar";

// Status badge.
const Pill = ({ s }) => {
  const cls =
    s === STATUS.ACTIVE || s === STATUS.APPROVED
      ? "bg-green-100 text-green-700"
      : s === STATUS.DISABLED
        ? "bg-red-100 text-red-700"
        : "bg-amber-100 text-amber-700";
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full ${cls}`}>
      {statusLabel(s)}
    </span>
  );
};

// Subscription status badge (employers only).
const SubBadge = ({ status }) => {
  const s = status || DEFAULT_SUBSCRIPTION_STATUS;
  const cls =
    s === "active"
      ? "bg-green-100 text-green-700"
      : s === "trial"
        ? "bg-blue-100 text-blue-700"
        : s === "past_due"
          ? "bg-amber-100 text-amber-700"
          : "bg-red-100 text-red-700";
  return (
    <span
      className={`text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded ${cls}`}
    >
      {SUBSCRIPTION_STATUS_LABELS[s] || s}
    </span>
  );
};

export default function Users() {
  const { user, profile } = useAuth();
  const [users, setUsers] = useState([]);
  const [modal, setModal] = useState(false);
  const [f, setF] = useState({
    email: "",
    fullName: "",
    phone: "",
    address: "",
    bio: "",
    dateOfBirth: "",
    nationalId: "",
    emergencyContact: "",
    role: ROLES.EMPLOYEE,
    tier: DEFAULT_EMPLOYER_TIER,
    subscriptionStatus: DEFAULT_SUBSCRIPTION_STATUS,
  });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [tempPw, setTempPw] = useState(null); // { email, password, expiresAt }
  const [now, setNow] = useState(Date.now());

  // Edit-details modal state.
  const [editing, setEditing] = useState(null); // user object being edited, or null
  const [ef, setEf] = useState({
    fullName: "",
    phone: "",
    address: "",
    bio: "",
    dateOfBirth: "",
    nationalId: "",
    emergencyContact: "",
    tier: DEFAULT_EMPLOYER_TIER,
    subscriptionStatus: DEFAULT_SUBSCRIPTION_STATUS,
  });
  const [eErr, setEErr] = useState("");
  const [eBusy, setEBusy] = useState(false);

  useEffect(
    () =>
      onSnapshot(
        query(collection(db, COLLECTIONS.USERS), orderBy("createdAt", "desc")),
        (s) => setUsers(s.docs.map((d) => ({ id: d.id, ...d.data() }))),
        () => {},
      ),
    [],
  );

  // Tick countdown.
  useEffect(() => {
    if (!tempPw) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [tempPw]);

  // Auto-clear temp password.
  useEffect(() => {
    if (tempPw && now >= tempPw.expiresAt) setTempPw(null);
  }, [tempPw, now]);

  const employers = useMemo(
    () => users.filter((u) => u.role === ROLES.EMPLOYER),
    [users],
  );
  const employees = useMemo(
    () => users.filter((u) => u.role === ROLES.EMPLOYEE),
    [users],
  );

  // Create user via secondary auth.
  const onCreate = async (e) => {
    e.preventDefault();
    setErr("");
    // Required-field guard (all details mandatory).
    const required = [
      "email",
      "fullName",
      "phone",
      "address",
      "bio",
      "dateOfBirth",
      "nationalId",
      "emergencyContact",
    ];
    for (const k of required) {
      if (!String(f[k] || "").trim()) {
        setErr("Please fill in all fields. Every detail is required.");
        return;
      }
    }
    setBusy(true);
    try {
      const password = generateTempPassword();
      const sec = getSecondaryAuth();
      const cred = await createUserWithEmailAndPassword(
        sec,
        f.email.trim(),
        password,
      );
      const isEmployer = f.role === ROLES.EMPLOYER;
      await setDoc(doc(db, COLLECTIONS.USERS, cred.user.uid), {
        uid: cred.user.uid,
        email: f.email.trim(),
        fullName: f.fullName.trim(),
        phone: f.phone.trim(),
        address: f.address.trim(),
        bio: f.bio.trim(),
        dateOfBirth: f.dateOfBirth,
        nationalId: f.nationalId.trim(),
        emergencyContact: f.emergencyContact.trim(),
        role: f.role,
        // Employer-only fields (tier + subscription) — admin-managed.
        ...(isEmployer
          ? {
              tier: f.tier || DEFAULT_EMPLOYER_TIER,
              subscriptionStatus:
                f.subscriptionStatus || DEFAULT_SUBSCRIPTION_STATUS,
            }
          : {}),
        status: STATUS.PENDING,
        mustChangePassword: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: user.uid,
      });
      await fbSignOut(sec);
      logAction(AUDIT.ACCOUNT_CREATED, user.uid, profile?.role, {
        email: f.email.trim(),
        role: f.role,
      });
      setTempPw({
        email: f.email.trim(),
        password,
        expiresAt: Date.now() + TEMP_PASSWORD_TTL_MS,
      });
      setF({
        email: "",
        fullName: "",
        phone: "",
        address: "",
        bio: "",
        dateOfBirth: "",
        nationalId: "",
        emergencyContact: "",
        role: ROLES.EMPLOYEE,
        tier: DEFAULT_EMPLOYER_TIER,
        subscriptionStatus: DEFAULT_SUBSCRIPTION_STATUS,
      });
      setModal(false);
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setBusy(false);
    }
  };

  // Update status helper.
  const setStatus = async (u, status, action) => {
    await updateDoc(doc(db, COLLECTIONS.USERS, u.id), {
      status,
      updatedAt: serverTimestamp(),
    });
    logAction(action, user.uid, profile?.role, {
      targetUid: u.id,
      email: u.email,
    });
  };

  // Open edit-details modal for a user.
  const openEdit = (u) => {
    setEditing(u);
    setEf({
      fullName: u.fullName || "",
      phone: u.phone || "",
      address: u.address || "",
      bio: u.bio || "",
      dateOfBirth: u.dateOfBirth || "",
      nationalId: u.nationalId || "",
      emergencyContact: u.emergencyContact || "",
      tier: u.tier || DEFAULT_EMPLOYER_TIER,
      subscriptionStatus: u.subscriptionStatus || DEFAULT_SUBSCRIPTION_STATUS,
    });
    setEErr("");
  };

  // Save edited details.
  const onSaveEdit = async (e) => {
    e.preventDefault();
    if (!editing) return;
    setEBusy(true);
    setEErr("");
    try {
      const isEmployer = editing.role === ROLES.EMPLOYER;
      const payload = {
        fullName: ef.fullName,
        phone: ef.phone,
        address: ef.address,
        bio: ef.bio,
        dateOfBirth: ef.dateOfBirth,
        nationalId: ef.nationalId,
        emergencyContact: ef.emergencyContact,
        ...(isEmployer
          ? {
              tier: ef.tier || DEFAULT_EMPLOYER_TIER,
              subscriptionStatus:
                ef.subscriptionStatus || DEFAULT_SUBSCRIPTION_STATUS,
            }
          : {}),
      };
      await updateDoc(doc(db, COLLECTIONS.USERS, editing.id), {
        ...payload,
        updatedAt: serverTimestamp(),
      });
      logAction(AUDIT.PROFILE_UPDATED, user.uid, profile?.role, {
        targetUid: editing.id,
        email: editing.email,
      });
      setEditing(null);
    } catch (e2) {
      setEErr(e2.message);
    } finally {
      setEBusy(false);
    }
  };

  // User row.
  const Row = ({ u }) => (
    <li className="py-3 flex items-center gap-3">
      <Avatar fullName={u.fullName} photoURL={u.photoURL} size={36} />
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">{u.fullName}</div>
        <div className="text-xs text-muted-foreground truncate">{u.email}</div>
        {u.role === ROLES.EMPLOYER && (
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            <span className="text-[10px] uppercase tracking-wide bg-accent/15 text-accent px-1.5 py-0.5 rounded">
              {u.tier || DEFAULT_EMPLOYER_TIER}
            </span>
            <SubBadge status={u.subscriptionStatus} />
          </div>
        )}
      </div>
      <Pill s={u.status} />
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => openEdit(u)}>
          <Pencil className="w-4 h-4 inline mr-1" /> Edit
        </Button>
        {u.status === STATUS.PENDING && (
          <Button
            onClick={() => setStatus(u, STATUS.APPROVED, AUDIT.USER_APPROVED)}
          >
            Approve
          </Button>
        )}
        {u.status !== STATUS.DISABLED ? (
          <Button
            variant="danger"
            onClick={() => setStatus(u, STATUS.DISABLED, AUDIT.USER_DISABLED)}
          >
            Disable
          </Button>
        ) : (
          <Button
            onClick={() => setStatus(u, STATUS.ACTIVE, AUDIT.USER_REENABLED)}
          >
            Re-enable
          </Button>
        )}
      </div>
    </li>
  );

  return (
    <Layout>
      <PageHeader
        title="User management"
        subtitle="Create and manage all accounts."
        right={
          <Button onClick={() => setModal(true)}>
            <UserPlus className="w-4 h-4 inline mr-1" /> New user
          </Button>
        }
      />
      {tempPw && (
        <Alert tone="info">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="font-semibold">
                Temp password for {tempPw.email}
              </div>
              <code className="text-base font-mono">{tempPw.password}</code>
              <div className="text-xs mt-1">
                Vanishes in{" "}
                {Math.max(0, Math.ceil((tempPw.expiresAt - now) / 1000))}s —
                copy now.
              </div>
            </div>
            <button
              onClick={() => navigator.clipboard.writeText(tempPw.password)}
              className="p-2 hover:bg-accent/20 rounded"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
        </Alert>
      )}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <h2 className="font-semibold text-primary mb-3">
            Employers ({employers.length})
          </h2>
          {!employers.length ? (
            <div className="text-sm text-muted-foreground py-4">None.</div>
          ) : (
            <ul className="divide-y divide-border">
              {employers.map((u) => (
                <Row key={u.id} u={u} />
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <h2 className="font-semibold text-primary mb-3">
            Employees ({employees.length})
          </h2>
          {!employees.length ? (
            <div className="text-sm text-muted-foreground py-4">None.</div>
          ) : (
            <ul className="divide-y divide-border">
              {employees.map((u) => (
                <Row key={u.id} u={u} />
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="Create user">
        <Alert tone="error">{err}</Alert>
        <p className="text-xs text-muted-foreground mb-3">
          All fields are required.
        </p>
        <form onSubmit={onCreate} className="space-y-4">
          <Input
            label="Full name"
            value={f.fullName}
            onChange={(v) => setF((p) => ({ ...p, fullName: v }))}
            required
          />
          <Input
            label="Email"
            type="email"
            value={f.email}
            onChange={(v) => setF((p) => ({ ...p, email: v }))}
            required
          />
          <Input
            label="Phone"
            value={f.phone}
            onChange={(v) => setF((p) => ({ ...p, phone: v }))}
            required
          />
          <Textarea
            label="Address"
            value={f.address}
            onChange={(v) => setF((p) => ({ ...p, address: v }))}
            rows={2}
            required
          />
          <Textarea
            label="Bio"
            value={f.bio}
            onChange={(v) => setF((p) => ({ ...p, bio: v }))}
            rows={2}
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Date of birth"
              type="date"
              value={f.dateOfBirth}
              onChange={(v) => setF((p) => ({ ...p, dateOfBirth: v }))}
              required
            />
            <Input
              label="National ID"
              value={f.nationalId}
              onChange={(v) => setF((p) => ({ ...p, nationalId: v }))}
              required
            />
          </div>
          <Input
            label="Emergency contact"
            value={f.emergencyContact}
            onChange={(v) => setF((p) => ({ ...p, emergencyContact: v }))}
            required
          />
          <Select
            label="Role"
            value={f.role}
            onChange={(v) => setF((p) => ({ ...p, role: v }))}
            options={[
              { value: ROLES.EMPLOYEE, label: "Employee" },
              { value: ROLES.EMPLOYER, label: "Employer" },
              { value: ROLES.ADMIN, label: "Admin" },
            ]}
          />
          {f.role === ROLES.EMPLOYER && (
            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Tier"
                value={f.tier}
                onChange={(v) => setF((p) => ({ ...p, tier: v }))}
                options={EMPLOYER_TIERS}
              />
              <Select
                label="Subscription status"
                value={f.subscriptionStatus}
                onChange={(v) => setF((p) => ({ ...p, subscriptionStatus: v }))}
                options={SUBSCRIPTION_STATUS_OPTIONS.map((s) => ({
                  value: s,
                  label: SUBSCRIPTION_STATUS_LABELS[s] || s,
                }))}
              />
            </div>
          )}
          <div className="flex gap-2">
            <Button type="submit" disabled={busy}>
              {busy ? "Creating…" : "Create"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setModal(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit user details modal (admin-only) */}
      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={
          editing
            ? `Edit details — ${editing.fullName || editing.email}`
            : "Edit details"
        }
      >
        <Alert tone="error">{eErr}</Alert>
        <form onSubmit={onSaveEdit} className="space-y-4">
          <Input
            label="Full name"
            value={ef.fullName}
            onChange={(v) => setEf((p) => ({ ...p, fullName: v }))}
            required
          />
          <Input
            label="Phone"
            value={ef.phone}
            onChange={(v) => setEf((p) => ({ ...p, phone: v }))}
          />
          <Textarea
            label="Address"
            value={ef.address}
            onChange={(v) => setEf((p) => ({ ...p, address: v }))}
            rows={2}
          />
          <Textarea
            label="Bio"
            value={ef.bio}
            onChange={(v) => setEf((p) => ({ ...p, bio: v }))}
            rows={2}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Date of birth"
              type="date"
              value={ef.dateOfBirth}
              onChange={(v) => setEf((p) => ({ ...p, dateOfBirth: v }))}
            />
            <Input
              label="National ID"
              value={ef.nationalId}
              onChange={(v) => setEf((p) => ({ ...p, nationalId: v }))}
            />
          </div>
          <Input
            label="Emergency contact"
            value={ef.emergencyContact}
            onChange={(v) => setEf((p) => ({ ...p, emergencyContact: v }))}
          />
          {editing?.role === ROLES.EMPLOYER && (
            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Tier"
                value={ef.tier}
                onChange={(v) => setEf((p) => ({ ...p, tier: v }))}
                options={EMPLOYER_TIERS}
              />
              <Select
                label="Subscription status"
                value={ef.subscriptionStatus}
                onChange={(v) =>
                  setEf((p) => ({ ...p, subscriptionStatus: v }))
                }
                options={SUBSCRIPTION_STATUS_OPTIONS.map((s) => ({
                  value: s,
                  label: SUBSCRIPTION_STATUS_LABELS[s] || s,
                }))}
              />
            </div>
          )}
          <div className="flex gap-2">
            <Button type="submit" disabled={eBusy}>
              {eBusy ? "Saving…" : "Save changes"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditing(null)}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Modal>
    </Layout>
  );
}
