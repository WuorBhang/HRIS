// Single-employee detail with tabs.
import { useEffect, useMemo, useState } from "react";
import { useParams, useLocation, Link } from "wouter";
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../lib/firebase";
import { COLLECTIONS } from "../../lib/constants";
import { formatDate } from "../../lib/utils";
import { subscribeDocumentsForContract } from "../../lib/documents";
import { Card, PageHeader } from "../../lib/ui";
import Layout from "../../components/Layout";
import DocumentList from "../../components/DocumentList";
import Spinner from "../../components/Spinner";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "leave", label: "Leave" },
  { id: "timesheet", label: "Timesheet" },
  { id: "payslips", label: "Payslips" },
  { id: "docs", label: "Contract docs" },
];

const Stat = ({ label, value }) => (
  <div className="bg-muted/30 rounded-md p-3 text-center">
    <div className="text-xl font-bold text-primary">{value}</div>
    <div className="text-xs text-muted-foreground">{label}</div>
  </div>
);

export default function EmployeeDetail() {
  const { contractId } = useParams();
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("overview");
  const [leave, setLeave] = useState([]);
  const [overtime, setOvertime] = useState([]);
  const [docs, setDocs] = useState([]);

  useEffect(() => {
    (async () => {
      const snap = await getDoc(doc(db, COLLECTIONS.CONTRACTS, contractId));
      if (!snap.exists() || snap.data().employerId !== user.uid) {
        navigate("/employer/employees");
        return;
      }
      setContract({ id: snap.id, ...snap.data() });
      setLoading(false);
    })();
  }, [contractId, user, navigate]);

  useEffect(() => {
    if (!contract) return;
    const u1 = onSnapshot(
      query(
        collection(db, COLLECTIONS.LEAVE_REQUESTS),
        where("contractId", "==", contract.id),
      ),
      (s) => setLeave(s.docs.map((d) => ({ id: d.id, ...d.data() }))),
      () => {},
    );
    const u2 = onSnapshot(
      query(
        collection(db, COLLECTIONS.OVERTIME_RECORDS),
        where("contractId", "==", contract.id),
      ),
      (s) => setOvertime(s.docs.map((d) => ({ id: d.id, ...d.data() }))),
      () => {},
    );
    const u3 = subscribeDocumentsForContract(contract.id, setDocs);
    return () => {
      u1();
      u2();
      u3();
    };
  }, [contract]);

  // Leave balances.
  const balances = useMemo(() => {
    if (!contract) return null;
    const used = (type) =>
      leave
        .filter((l) => l.status === "approved" && l.type === type)
        .reduce((a, b) => a + (b.days || 0), 0);
    return {
      paid: { total: contract.paidLeavePerYear || 0, used: used("Annual") },
      sick: { total: contract.sickLeavePerYear || 0, used: used("Sick") },
      comp: {
        total: contract.compassionateLeavePerYear || 0,
        used: used("Compassionate"),
      },
    };
  }, [leave, contract]);

  if (loading)
    return (
      <Layout>
        <div className="flex justify-center py-20">
          <Spinner />
        </div>
      </Layout>
    );
  if (!contract) return null;

  return (
    <Layout>
      <Link href="/employer/employees">
        <span className="inline-flex items-center gap-1 text-sm text-primary mb-3 cursor-pointer hover:underline">
          <ArrowLeft className="w-4 h-4" /> Back
        </span>
      </Link>
      <PageHeader
        title={contract.employeeName}
        subtitle={`${contract.type} · since ${formatDate(contract.startDate)}`}
      />

      <div className="flex gap-1 border-b border-border mb-4 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-3 py-2 text-sm whitespace-nowrap ${tab === t.id ? "text-primary border-b-2 border-primary font-semibold" : "text-muted-foreground"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && balances && (
        <Card>
          <h3 className="font-semibold mb-3">Leave balances</h3>
          <div className="grid grid-cols-3 gap-3 mb-6">
            <Stat
              label="Paid"
              value={`${balances.paid.total - balances.paid.used}/${balances.paid.total}`}
            />
            <Stat
              label="Sick"
              value={`${balances.sick.total - balances.sick.used}/${balances.sick.total}`}
            />
            <Stat
              label="Compassionate"
              value={`${balances.comp.total - balances.comp.used}/${balances.comp.total}`}
            />
          </div>
          <h3 className="font-semibold mb-2">Roles</h3>
          <div className="flex flex-wrap gap-2">
            {(contract.roles || []).length ? (
              contract.roles.map((r) => (
                <span
                  key={r}
                  className="bg-primary/10 text-primary text-xs px-2 py-1 rounded-full"
                >
                  {r}
                </span>
              ))
            ) : (
              <span className="text-sm text-muted-foreground">
                No roles set.
              </span>
            )}
          </div>
        </Card>
      )}

      {tab === "leave" && (
        <Card>
          {!leave.length ? (
            <div className="text-center text-sm text-muted-foreground py-6">
              No leave requests.
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {leave.map((l) => (
                <li key={l.id} className="py-2 text-sm">
                  <b>{l.type}</b> · {l.days}d · {formatDate(l.startDate)} →{" "}
                  {formatDate(l.endDate)} ·{" "}
                  <span className="capitalize">{l.status}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {tab === "timesheet" && (
        <Card>
          {!overtime.length ? (
            <div className="text-center text-sm text-muted-foreground py-6">
              No timesheet entries.
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {overtime.map((o) => (
                <li key={o.id} className="py-2 text-sm">
                  {o.isHoliday ? "Holiday work" : "Overtime"} · {o.hours}h ·{" "}
                  {formatDate(o.date)} ·{" "}
                  <span className="capitalize">{o.status}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {tab === "payslips" && (
        <DocumentList
          documents={docs.filter((d) => d.type === "payslip")}
          emptyText="No payslips."
        />
      )}
      {tab === "statutory" && (
        <DocumentList
          documents={docs.filter(
            (d) => d.type === "statutory" || d.type === "payroll_summary",
          )}
          emptyText="No statutory docs."
        />
      )}
      {tab === "docs" && (
        <DocumentList
          documents={docs.filter((d) => d.type === "contract")}
          emptyText="No contract docs."
        />
      )}
    </Layout>
  );
}
