// Admin contracts: create + list + delete.
import { useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import { Plus, Trash2, X } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../lib/firebase";
import { COLLECTIONS, CONTRACT_TYPES, ROLES } from "../../lib/constants";
import { formatDate } from "../../lib/utils";
import { AUDIT, logAction } from "../../lib/audit";
import {
  Input,
  Select,
  Button,
  Alert,
  Card,
  PageHeader,
  Modal,
} from "../../lib/ui";
import Layout from "../../components/Layout";

const blank = {
  employerId: "",
  employeeId: "",
  type: CONTRACT_TYPES[0],
  startDate: "",
  endDate: "",
  salary: "",
  roles: [],
  paidLeavePerYear: 21,
  sickLeavePerYear: 7,
  compassionateLeavePerYear: 5,
  overtimeMultiplier: 1.5,
  holidayMultiplier: 2.0,
  notes: "",
};

export default function Contracts() {
  const { user, profile } = useAuth();
  const [users, setUsers] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [modal, setModal] = useState(false);
  const [f, setF] = useState(blank);
  const [chip, setChip] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(
    () =>
      onSnapshot(
        collection(db, COLLECTIONS.USERS),
        (s) => setUsers(s.docs.map((d) => ({ id: d.id, ...d.data() }))),
        () => {},
      ),
    [],
  );
  useEffect(
    () =>
      onSnapshot(
        query(
          collection(db, COLLECTIONS.CONTRACTS),
          orderBy("createdAt", "desc"),
        ),
        (s) => setContracts(s.docs.map((d) => ({ id: d.id, ...d.data() }))),
        () => {},
      ),
    [],
  );

  const employers = useMemo(
    () => users.filter((u) => u.role === ROLES.EMPLOYER),
    [users],
  );
  const employees = useMemo(
    () => users.filter((u) => u.role === ROLES.EMPLOYEE),
    [users],
  );
  const userMap = useMemo(
    () => Object.fromEntries(users.map((u) => [u.id, u])),
    [users],
  );

  // Add role chip.
  const addChip = () => {
    const v = chip.trim();
    if (!v) return;
    setF((p) => ({ ...p, roles: [...new Set([...p.roles, v])] }));
    setChip("");
  };
  const removeChip = (r) =>
    setF((p) => ({ ...p, roles: p.roles.filter((x) => x !== r) }));

  // Submit create.
  const onCreate = async (e) => {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      const er = userMap[f.employerId],
        ee = userMap[f.employeeId];
      if (!er || !ee) throw new Error("Pick both employer and employee.");

      // Atomically allocate the next contract number from /counters/contracts.
      const counterRef = doc(db, COLLECTIONS.COUNTERS, "contracts");
      const nextNumber = await runTransaction(db, async (tx) => {
        const cs = await tx.get(counterRef);
        const current = cs.exists() ? Number(cs.data().value) || 0 : 0;
        const next = current + 1;
        tx.set(
          counterRef,
          { value: next, updatedAt: serverTimestamp() },
          { merge: true },
        );
        return next;
      });
      const contractNo = `CON-${String(nextNumber).padStart(4, "0")}`;

      const ref = await addDoc(collection(db, COLLECTIONS.CONTRACTS), {
        ...f,
        salary: Number(f.salary) || 0,
        employerName: er.fullName,
        employeeName: ee.fullName,
        contractNumber: nextNumber,
        contractNo,
        createdAt: serverTimestamp(),
        createdBy: user.uid,
      });
      logAction(AUDIT.CONTRACT_CREATED, user.uid, profile?.role, {
        contractId: ref.id,
        contractNo,
        employerId: f.employerId,
        employeeId: f.employeeId,
      });
      setF(blank);
      setModal(false);
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setBusy(false);
    }
  };

  // Delete contract.
  const onDelete = async (c) => {
    if (!confirm(`Delete contract for ${c.employeeName}?`)) return;
    await deleteDoc(doc(db, COLLECTIONS.CONTRACTS, c.id));
    logAction(AUDIT.CONTRACT_DELETED, user.uid, profile?.role, {
      contractId: c.id,
    });
  };

  return (
    <Layout>
      <PageHeader
        title="Contracts"
        subtitle="Link employers to employees."
        right={
          <Button onClick={() => setModal(true)}>
            <Plus className="w-4 h-4 inline mr-1" /> New contract
          </Button>
        }
      />
      <Card>
        {!contracts.length ? (
          <div className="text-center text-sm text-muted-foreground py-10">
            No contracts yet.
          </div>
        ) : (
          <>
            <table className="w-full text-sm hidden md:table">
              <thead>
                <tr className="text-left text-muted-foreground border-b border-border">
                  <th className="py-2">Contract #</th>
                  <th>Employer</th>
                  <th>Employee</th>
                  <th>Type</th>
                  <th>Period</th>
                  <th>Salary</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {contracts.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-border last:border-0"
                  >
                    <td className="py-2 font-mono text-xs">
                      {c.contractNo || "—"}
                    </td>
                    <td>{c.employerName}</td>
                    <td>{c.employeeName}</td>
                    <td>{c.type}</td>
                    <td>
                      {formatDate(c.startDate)}
                      {c.endDate ? ` → ${formatDate(c.endDate)}` : ""}
                    </td>
                    <td>{Number(c.salary || 0).toLocaleString()}</td>
                    <td>
                      <button
                        onClick={() => onDelete(c)}
                        className="text-destructive p-1 hover:bg-destructive/10 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <ul className="md:hidden divide-y divide-border">
              {contracts.map((c) => (
                <li key={c.id} className="py-3">
                  <div className="text-xs text-muted-foreground font-mono">
                    {c.contractNo || "—"}
                  </div>
                  <div className="font-medium">
                    {c.employeeName} ↔ {c.employerName}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {c.type} · {formatDate(c.startDate)}
                  </div>
                  <button
                    onClick={() => onDelete(c)}
                    className="text-destructive text-xs mt-1"
                  >
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>

      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title="Create contract"
      >
        <Alert tone="error">{err}</Alert>
        <form onSubmit={onCreate} className="space-y-4">
          <Select
            label="Employer"
            value={f.employerId}
            onChange={(v) => setF((p) => ({ ...p, employerId: v }))}
            required
          >
            <option value="">Pick employer…</option>
            {employers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.fullName}
              </option>
            ))}
          </Select>
          <Select
            label="Employee"
            value={f.employeeId}
            onChange={(v) => setF((p) => ({ ...p, employeeId: v }))}
            required
          >
            <option value="">Pick employee…</option>
            {employees.map((u) => (
              <option key={u.id} value={u.id}>
                {u.fullName}
              </option>
            ))}
          </Select>
          <Select
            label="Type"
            value={f.type}
            onChange={(v) => setF((p) => ({ ...p, type: v }))}
            options={CONTRACT_TYPES}
          />
          <div>
            <label className="block text-sm font-medium mb-1">Roles</label>
            <div className="flex gap-2">
              <input
                value={chip}
                onChange={(e) => setChip(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" && (e.preventDefault(), addChip())
                }
                className="flex-1 px-3 py-2 rounded-md border border-border"
                placeholder="Add role"
              />
              <Button type="button" variant="outline" onClick={addChip}>
                Add
              </Button>
            </div>
            {f.roles.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {f.roles.map((r) => (
                  <span
                    key={r}
                    className="bg-primary/10 text-primary text-xs px-2 py-1 rounded-full flex items-center gap-1"
                  >
                    {r}{" "}
                    <button type="button" onClick={() => removeChip(r)}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Start date"
              type="date"
              value={f.startDate}
              onChange={(v) => setF((p) => ({ ...p, startDate: v }))}
              required
            />
            <Input
              label="End date"
              type="date"
              value={f.endDate}
              onChange={(v) => setF((p) => ({ ...p, endDate: v }))}
            />
          </div>
          <Input
            label="Monthly salary (KES)"
            type="number"
            value={f.salary}
            onChange={(v) => setF((p) => ({ ...p, salary: v }))}
          />
          <div className="grid grid-cols-3 gap-3">
            <Input
              label="Paid days/yr"
              type="number"
              value={f.paidLeavePerYear}
              onChange={(v) =>
                setF((p) => ({ ...p, paidLeavePerYear: Number(v) }))
              }
            />
            <Input
              label="Sick days/yr"
              type="number"
              value={f.sickLeavePerYear}
              onChange={(v) =>
                setF((p) => ({ ...p, sickLeavePerYear: Number(v) }))
              }
            />
            <Input
              label="Comp. days/yr"
              type="number"
              value={f.compassionateLeavePerYear}
              onChange={(v) =>
                setF((p) => ({ ...p, compassionateLeavePerYear: Number(v) }))
              }
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Overtime ×"
              type="number"
              step="0.1"
              value={f.overtimeMultiplier}
              onChange={(v) =>
                setF((p) => ({ ...p, overtimeMultiplier: Number(v) }))
              }
            />
            <Input
              label="Holiday ×"
              type="number"
              step="0.1"
              value={f.holidayMultiplier}
              onChange={(v) =>
                setF((p) => ({ ...p, holidayMultiplier: Number(v) }))
              }
            />
          </div>
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
    </Layout>
  );
}
