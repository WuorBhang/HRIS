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

// Contract-IDs cell — small monospace pill list.
const ContractIds = ({ ids }) => {
  if (!ids?.length) return <span className="text-muted-foreground">—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {ids.map((id) => (
        <span
          key={id}
          className="font-mono text-[11px] px-1.5 py-0.5 bg-muted/40 rounded"
        >
          {id}
        </span>
      ))}
    </div>
  );
};

// Table-based section for the Table view (employer / employee rows with
// contract IDs, status badge and inline actions).
const TableSection = ({
  title,
  rows,
  contractsByUser,
  onEdit,
  onSetStatus,
}) => (
  <Card>
    <h2 className="font-semibold text-primary mb-3">
      {title} ({rows.length})
    </h2>
    {!rows.length ? (
      <div className="text-sm text-muted-foreground py-4">None.</div>
    ) : (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-muted-foreground border-b border-border">
              <th className="py-2 pr-3">Name</th>
              <th className="pr-3">Email</th>
              <th className="pr-3">Contract&nbsp;ID</th>
              <th className="pr-3">Status</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => (
              <tr
                key={u.id}
                className="border-b border-border last:border-0 align-top"
              >
                <td className="py-2 pr-3 font-medium">{u.fullName || "—"}</td>
                <td className="pr-3 text-muted-foreground truncate max-w-[14rem]">
                  {u.email}
                </td>
                <td className="pr-3">
                  <ContractIds ids={contractsByUser[u.id]} />
                </td>
                <td className="pr-3">
                  <Pill s={u.status} />
                </td>
                <td>
                  <div className="flex justify-end gap-2 flex-wrap">
                    <Button variant="outline" onClick={() => onEdit(u)}>
                      <Pencil className="w-4 h-4 inline mr-1" /> Edit
                    </Button>
                    {u.status === STATUS.PENDING && (
                      <Button
                        onClick={() =>
                          onSetStatus(u, STATUS.APPROVED, AUDIT.USER_APPROVED)
                        }
                      >
                        Approve
                      </Button>
                    )}
                    {u.status !== STATUS.DISABLED ? (
                      <Button
                        variant="danger"
                        onClick={() =>
                          onSetStatus(u, STATUS.DISABLED, AUDIT.USER_DISABLED)
                        }
                      >
                        Disable
                      </Button>
                    ) : (
                      <Button
                        onClick={() =>
                          onSetStatus(u, STATUS.ACTIVE, AUDIT.USER_REENABLED)
                        }
                      >
                        Re-enable
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </Card>
);

export default function Users() {
  const { user, profile } = useAuth();
  const [users, setUsers] = useState([]);
  const [contracts, setContracts] = useState([]);
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

  // Subscribe to contracts so we can show each user's contract IDs in the
  // table view (employer rows, employee rows, contract ID column).
  useEffect(
    () =>
      onSnapshot(
        collection(db, COLLECTIONS.CONTRACTS),
        (s) => setContracts(s.docs.map((d) => ({ id: d.id, ...d.data() }))),
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

  // Map each user → contract identifiers (prefer human-readable contractNo).
  const contractsByUser = useMemo(() => {
    const map = {};
    for (const c of contracts) {
      const label = c.contractNo || c.id;
      const push = (uid) => {
        if (!uid) return;
        (map[uid] = map[uid] || []).push(label);
      };
      push(c.employerId);
      push(c.employeeId);
    }
    return map;
  }, [contracts]);

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
      <div className="space-y-6">
        <TableSection
          title="Employers"
          rows={employers}
          contractsByUser={contractsByUser}
          onEdit={openEdit}
          onSetStatus={setStatus}
        />
        <TableSection
          title="Employees"
          rows={employees}
          contractsByUser={contractsByUser}
          onEdit={openEdit}
          onSetStatus={setStatus}
        />
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
