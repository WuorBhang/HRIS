// Manage Employee detail page (spec 5.2.2): shows worker info, leave
// balances, contract details, and quick links to leave / timesheets /
// payslips / statutory records for that single employee.

import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "wouter";
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import {
  Briefcase,
  Calendar,
  FileText,
  Clock,
  Wallet,
  ScrollText,
} from "lucide-react";
import Layout from "../../components/Layout";
import DocumentList from "../../components/DocumentList";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../lib/firebase";
import { COLLECTIONS, DOCUMENT_TYPES } from "../../lib/constants";
import { formatDate } from "../../lib/utils";
import { subscribeDocumentsForContract } from "../../lib/documents";

const TABS = [
  { key: "overview", label: "Overview", icon: Briefcase },
  { key: "leave", label: "Leave", icon: Calendar },
  { key: "timesheet", label: "Timesheet", icon: Clock },
  { key: "payslips", label: "Payslips", icon: Wallet },
  { key: "statutory", label: "Statutory", icon: ScrollText },
  { key: "contract", label: "Contract docs", icon: FileText },
];

export default function EmployerEmployeeDetail() {
  const { user } = useAuth();
  const params = useParams();
  const contractId = params.contractId;

  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(true);
  const [leave, setLeave] = useState([]);
  const [overtime, setOvertime] = useState([]);
  const [docs, setDocs] = useState([]);
  const [tab, setTab] = useState("overview");

  useEffect(() => {
    if (!contractId) return;
    let cancelled = false;
    (async () => {
      const snap = await getDoc(doc(db, COLLECTIONS.CONTRACTS, contractId));
      if (cancelled) return;
      setContract(snap.exists() ? { id: snap.id, ...snap.data() } : null);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [contractId]);

  useEffect(() => {
    if (!contract?.employeeId || !user) return;
    const unsubL = onSnapshot(
      query(
        collection(db, COLLECTIONS.LEAVE_REQUESTS),
        where("employerId", "==", user.uid),
        where("employeeId", "==", contract.employeeId),
      ),
      (s) => setLeave(s.docs.map((d) => ({ id: d.id, ...d.data() }))),
    );
    const unsubO = onSnapshot(
      query(
        collection(db, COLLECTIONS.OVERTIME_RECORDS),
        where("employerId", "==", user.uid),
        where("employeeId", "==", contract.employeeId),
      ),
      (s) => setOvertime(s.docs.map((d) => ({ id: d.id, ...d.data() }))),
    );
    const unsubD = subscribeDocumentsForContract(contract.id, setDocs);
    return () => {
      unsubL();
      unsubO();
      unsubD();
    };
  }, [contract, user]);

  const balance = contract?.leaveBalance || {};
  const entitle = contract?.leaveEntitlement || {};

  const payslips = useMemo(
    () => docs.filter((d) => d.type === DOCUMENT_TYPES.PAYSLIP),
    [docs],
  );
  const statutory = useMemo(
    () => docs.filter((d) => d.type === DOCUMENT_TYPES.STATUTORY),
    [docs],
  );
  const contractDocs = useMemo(
    () => docs.filter((d) => d.type === DOCUMENT_TYPES.CONTRACT),
    [docs],
  );

  if (loading) {
    return (
      <Layout>
        <div className="text-muted-foreground">Loading…</div>
      </Layout>
    );
  }

  if (!contract) {
    return (
      <Layout>
        <div className="bg-card rounded-lg shadow p-6">
          <p className="text-sm text-muted-foreground">Contract not found.</p>
          <Link href="/employer/employees">
            <span className="text-primary underline text-sm cursor-pointer">
              ← Back to My Employees
            </span>
          </Link>
        </div>
      </Layout>
    );
  }

  if (contract.employerId !== user?.uid) {
    return (
      <Layout>
        <div className="bg-card rounded-lg shadow p-6 text-sm text-destructive">
          You don't have access to this contract.
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mb-4">
        <Link href="/employer/employees">
          <span className="text-sm text-primary underline cursor-pointer">
            ← My Employees
          </span>
        </Link>
      </div>

      <div className="bg-card rounded-lg shadow p-5 sm:p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg shrink-0">
              {(contract.employeeName || "?").charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-primary truncate">
                {contract.employeeName || contract.employeeEmail || "Employee"}
              </h1>
              <p className="text-sm text-muted-foreground truncate">
                {contract.position || "—"}
                {contract.contractType && ` · ${contract.contractType}`}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Started {formatDate(contract.startDate)}
              </p>
            </div>
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-3 mt-5">
          <BalanceCard
            label="Paid leave"
            balance={balance.paid}
            total={entitle.paid}
          />
          <BalanceCard
            label="Sick leave"
            balance={balance.sick}
            total={entitle.sick}
          />
          <BalanceCard
            label="Compassionate"
            balance={balance.compassionate}
            total={entitle.compassionate}
          />
        </div>
      </div>

      <div className="bg-card rounded-lg shadow">
        <div className="flex border-b border-border overflow-x-auto">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-4 sm:px-5 py-3 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition inline-flex items-center gap-2 ${
                  tab === t.key
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="w-4 h-4" />
                {t.label}
              </button>
            );
          })}
        </div>

        <div className="p-4 sm:p-6">
          {tab === "overview" && (
            <div className="grid sm:grid-cols-2 gap-4 text-sm">
              <Field label="Email" value={contract.employeeEmail} />
              <Field label="Phone" value={contract.employeePhone} />
              <Field
                label="Roles"
                value={
                  Array.isArray(contract.roles) && contract.roles.length > 0
                    ? contract.roles.join(", ")
                    : contract.position
                }
              />
              <Field label="Contract type" value={contract.contractType} />
              <Field
                label="Start date"
                value={formatDate(contract.startDate)}
              />
              <Field
                label="End date"
                value={
                  contract.endDate ? formatDate(contract.endDate) : "Open-ended"
                }
              />
              <Field
                label="Gross salary"
                value={
                  contract.grossSalary
                    ? `KES ${contract.grossSalary.toLocaleString()}`
                    : "—"
                }
              />
              <Field
                label="Allowances"
                value={
                  contract.allowances
                    ? `KES ${contract.allowances.toLocaleString()}`
                    : "—"
                }
              />
              <Field
                label="Overtime multiplier"
                value={contract.overtimeMultiplier}
              />
              <Field
                label="Holiday work multiplier"
                value={contract.holidayMultiplier}
              />
            </div>
          )}

          {tab === "leave" && <LeaveTab leave={leave} />}
          {tab === "timesheet" && <TimesheetTab overtime={overtime} />}
          {tab === "payslips" && (
            <DocumentList
              documents={payslips}
              emptyText="No payslips uploaded yet."
            />
          )}
          {tab === "statutory" && (
            <DocumentList
              documents={statutory}
              emptyText="No statutory records uploaded yet."
            />
          )}
          {tab === "contract" && (
            <DocumentList
              documents={contractDocs}
              emptyText="No signed contract uploaded yet."
            />
          )}
        </div>
      </div>
    </Layout>
  );
}

function BalanceCard({ label, balance, total }) {
  const has = typeof balance === "number";
  return (
    <div className="rounded-md border border-border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-bold text-primary leading-none">
        {has ? balance : "—"}
        {typeof total === "number" && (
          <span className="text-sm font-normal text-muted-foreground">
            {" "}
            / {total}
          </span>
        )}
      </div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground mt-1">
        days remaining
      </div>
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm font-medium text-foreground mt-0.5">
        {value || "—"}
      </div>
    </div>
  );
}

function LeaveTab({ leave }) {
  if (leave.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">No leave history.</div>
    );
  }
  const sorted = [...leave].sort(
    (a, b) =>
      (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0),
  );
  return (
    <ul className="divide-y divide-border">
      {sorted.map((r) => (
        <li key={r.id} className="py-3 flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-medium">{r.type}</div>
            <div className="text-xs text-muted-foreground">
              {formatDate(r.startDate)} → {formatDate(r.endDate)} · {r.days}d
            </div>
          </div>
          <span
            className={`text-xs px-2 py-1 rounded-full font-medium ${
              r.status === "approved"
                ? "bg-green-100 text-green-700"
                : r.status === "rejected"
                  ? "bg-red-100 text-red-700"
                  : "bg-accent/20 text-accent"
            }`}
          >
            {r.status}
          </span>
        </li>
      ))}
    </ul>
  );
}

function TimesheetTab({ overtime }) {
  if (overtime.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">No timesheet entries.</div>
    );
  }
  const sorted = [...overtime].sort(
    (a, b) =>
      (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0),
  );
  return (
    <ul className="divide-y divide-border">
      {sorted.map((r) => (
        <li key={r.id} className="py-3 flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-medium">
              {r.isHoliday ? "Holiday work" : "Overtime"} · {r.hours}h
            </div>
            <div className="text-xs text-muted-foreground">
              {formatDate(r.date)}
            </div>
          </div>
          <span
            className={`text-xs px-2 py-1 rounded-full font-medium ${
              r.status === "approved"
                ? "bg-green-100 text-green-700"
                : r.status === "rejected"
                  ? "bg-red-100 text-red-700"
                  : "bg-accent/20 text-accent"
            }`}
          >
            {r.status}
          </span>
        </li>
      ))}
    </ul>
  );
}
