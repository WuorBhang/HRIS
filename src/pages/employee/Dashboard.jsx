import { useEffect, useMemo, useState } from "react";
import {
  collection,
  documentId,
  getDocs,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import { Link } from "wouter";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import Layout from "../../components/Layout";
import UpcomingHolidays from "../../components/UpcomingHolidays";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../lib/firebase";
import { COLLECTIONS, STATUS } from "../../lib/constants";
import { formatDate, statusLabel } from "../../lib/utils";

const CORAL = "#FF7F50";

export default function EmployeeDashboard() {
  const { user, profile } = useAuth();
  const [contract, setContract] = useState(null);
  const [employer, setEmployer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [leaveItems, setLeaveItems] = useState([]);
  const [overtimeItems, setOvertimeItems] = useState([]);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, COLLECTIONS.CONTRACTS),
      where("employeeId", "==", user.uid),
    );
    const unsub = onSnapshot(q, async (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const c = list[0] || null;
      setContract(c);
      if (c?.employerId) {
        const us = await getDocs(
          query(
            collection(db, COLLECTIONS.USERS),
            where(documentId(), "==", c.employerId),
          ),
        );
        setEmployer(
          us.docs[0] ? { id: us.docs[0].id, ...us.docs[0].data() } : null,
        );
      } else {
        setEmployer(null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, [user]);

  // Subscribe to the employee's submissions so the status panel below
  // reflects employer decisions in real time.
  useEffect(() => {
    if (!user) return;
    const unsubLeave = onSnapshot(
      query(
        collection(db, COLLECTIONS.LEAVE_REQUESTS),
        where("employeeId", "==", user.uid),
      ),
      (snap) =>
        setLeaveItems(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      () => setLeaveItems([]),
    );
    const unsubOvertime = onSnapshot(
      query(
        collection(db, COLLECTIONS.OVERTIME_RECORDS),
        where("employeeId", "==", user.uid),
      ),
      (snap) =>
        setOvertimeItems(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      () => setOvertimeItems([]),
    );
    return () => {
      unsubLeave();
      unsubOvertime();
    };
  }, [user]);

  const overtimeOnly = useMemo(
    () => overtimeItems.filter((i) => i.isHoliday !== true),
    [overtimeItems],
  );
  const holidayOnly = useMemo(
    () => overtimeItems.filter((i) => i.isHoliday === true),
    [overtimeItems],
  );

  const isActive =
    profile?.status === STATUS.APPROVED || profile?.status === STATUS.ACTIVE;

  return (
    <Layout>
      {/* Header card */}
      <div className="bg-card rounded-lg shadow p-4 sm:p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-primary">
              Welcome, {profile?.fullName?.split(" ")[0] || "Employee"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1 break-words">
              {employer?.fullName
                ? `Employer: ${employer.fullName}`
                : "No employer linked yet"}
            </p>
            {contract && (
              <p className="text-sm text-muted-foreground">
                Contract start date:{" "}
                <span className="font-medium text-foreground">
                  {formatDate(contract.startDate)}
                </span>
              </p>
            )}
          </div>
          <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 shrink-0">
            <span
              className={`text-xs px-3 py-1 rounded-full font-medium ${
                isActive
                  ? "bg-green-100 text-green-700"
                  : "bg-accent/20 text-accent"
              }`}
            >
              {statusLabel(profile?.status)}
            </span>
            <Link href="/profile">
              <span className="text-sm text-primary underline cursor-pointer">
                View profile
              </span>
            </Link>
          </div>
        </div>
      </div>

      <UpcomingHolidays />

      {/* Three coral activity buttons */}
      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <ActivityButton
          to="/employee/leave"
          title="Request Leave"
          desc="Annual, sick, unpaid, or compassionate leave."
        />
        <ActivityButton
          to="/employee/overtime"
          title="Report Overtime"
          desc="Log extra hours you worked on a regular day."
        />
        <ActivityButton
          to="/employee/holiday"
          title="Report Holiday"
          desc="Log hours worked on a Kenya public holiday."
        />
      </div>

      {/* Status of recent submissions */}
      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <SubmissionsCard
          title="Leave requests"
          to="/employee/leave"
          items={leaveItems}
          renderPrimary={(it) =>
            `${it.type || "Leave"} · ${it.days || 0} day${
              it.days === 1 ? "" : "s"
            }`
          }
          renderSecondary={(it) =>
            `${formatDate(it.startDate)} → ${formatDate(it.endDate)}`
          }
        />
        <SubmissionsCard
          title="Overtime"
          to="/employee/overtime"
          items={overtimeOnly}
          renderPrimary={(it) => `${it.hours || 0}h overtime`}
          renderSecondary={(it) => formatDate(it.date)}
        />
        <SubmissionsCard
          title="Holiday work"
          to="/employee/holiday"
          items={holidayOnly}
          renderPrimary={(it) => `${it.hours || 0}h holiday work`}
          renderSecondary={(it) =>
            it.holidayName
              ? `${formatDate(it.date)} — ${it.holidayName}`
              : formatDate(it.date)
          }
        />
      </div>

      {/* Contract overview */}
      {loading ? (
        <div className="text-muted-foreground"></div>
      ) : !contract ? (
        <div className="bg-card rounded-lg shadow p-6 text-sm text-muted-foreground">
          You haven't been linked to an employer yet. The admin must create a
          contract for you before you can submit forms.
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-card rounded-lg shadow p-5">
            <div className="text-sm text-muted-foreground">Employer</div>
            <div className="font-semibold text-primary text-lg mt-1">
              {employer?.fullName || "—"}
            </div>
            <div className="text-sm text-muted-foreground">
              {employer?.email}
            </div>
            <div className="text-sm text-muted-foreground">
              {employer?.phone || "—"}
            </div>
          </div>
          <div className="bg-card rounded-lg shadow p-5">
            <div className="text-sm text-muted-foreground">Contract</div>
            <div className="mt-2 text-sm">
              <div>
                <span className="text-muted-foreground">Position: </span>
                <span className="font-medium">{contract.position || "—"}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Start date: </span>
                <span className="font-medium">
                  {formatDate(contract.startDate)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

function ActivityButton({ to, title, desc }) {
  return (
    <Link href={to}>
      <div
        className="rounded-lg shadow p-5 cursor-pointer hover:opacity-90 transition text-white"
        style={{ backgroundColor: CORAL }}
      >
        <div className="font-semibold text-lg">{title}</div>
        <div className="text-sm opacity-90 mt-1">{desc}</div>
      </div>
    </Link>
  );
}

function SubmissionsCard({
  title,
  to,
  items,
  renderPrimary,
  renderSecondary,
}) {
  const counts = useMemo(() => {
    const c = { pending: 0, approved: 0, rejected: 0 };
    for (const it of items) if (c[it.status] !== undefined) c[it.status]++;
    return c;
  }, [items]);

  const recent = useMemo(
    () =>
      [...items]
        .sort(
          (a, b) =>
            (b.createdAt?.toMillis?.() || 0) -
            (a.createdAt?.toMillis?.() || 0),
        )
        .slice(0, 3),
    [items],
  );

  return (
    <section className="bg-card rounded-lg shadow p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm sm:text-base font-semibold text-primary">
          {title}
        </h2>
        <Link href={to}>
          <span className="text-xs text-primary hover:underline cursor-pointer">
            View all →
          </span>
        </Link>
      </div>
      <div className="flex items-center gap-2 text-[11px] mb-3">
        <CountPill tone="amber">Pending {counts.pending}</CountPill>
        <CountPill tone="green">Approved {counts.approved}</CountPill>
        <CountPill tone="red">Rejected {counts.rejected}</CountPill>
      </div>
      {recent.length === 0 ? (
        <div className="text-xs text-muted-foreground py-2">
          No submissions yet.
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {recent.map((it) => (
            <li key={it.id} className="py-2 flex items-start gap-2">
              <StatusIcon status={it.status || "pending"} />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-foreground truncate">
                  {renderPrimary(it)}
                </div>
                <div className="text-[11px] text-muted-foreground truncate">
                  {renderSecondary(it)}
                </div>
              </div>
              <StatusBadge status={it.status || "pending"} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function StatusIcon({ status }) {
  if (status === "approved")
    return <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />;
  if (status === "rejected")
    return <XCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />;
  return <Clock className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />;
}

function StatusBadge({ status }) {
  const cls =
    status === "approved"
      ? "bg-green-100 text-green-700"
      : status === "rejected"
        ? "bg-red-100 text-red-700"
        : "bg-amber-100 text-amber-700";
  return (
    <span
      className={`text-[10px] px-2 py-0.5 rounded-full font-medium capitalize shrink-0 ${cls}`}
    >
      {status}
    </span>
  );
}

function CountPill({ tone, children }) {
  const cls =
    tone === "green"
      ? "bg-green-100 text-green-700"
      : tone === "red"
        ? "bg-red-100 text-red-700"
        : "bg-amber-100 text-amber-700";
  return (
    <span className={`px-2 py-0.5 rounded-full font-medium ${cls}`}>
      {children}
    </span>
  );
}
