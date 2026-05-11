// Blocks employee pages until account active + contract linked
// AND admin has set all required compensation/leave parameters.
import { useEffect, useState } from "react";
import { Link } from "wouter";
import { collection, getDocs, query, where } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { db } from "../lib/firebase";
import { COLLECTIONS, STATUS } from "../lib/constants";
import Spinner from "./Spinner";

// Required contract fields admin MUST configure before any feature unlocks.
// `grossSalary` accepts the legacy `salary` field as a fallback so existing
// contracts created with `salary` continue to work without migration.
const REQUIRED_FIELDS = [
  { key: "grossSalary", label: "Gross salary", aliases: ["salary"] },
  { key: "overtimeMultiplier", label: "Overtime multiplier" },
  { key: "holidayMultiplier", label: "Holiday multiplier" },
  { key: "paidLeavePerYear", label: "Paid leave per year" },
  { key: "sickLeavePerYear", label: "Sick leave per year" },
];

// A field is considered "set" if it resolves to a finite, positive number.
const fieldIsSet = (contract, field) => {
  const candidates = [field.key, ...(field.aliases || [])];
  for (const k of candidates) {
    const raw = contract?.[k];
    const n = typeof raw === "string" ? Number(raw) : raw;
    if (Number.isFinite(n) && n > 0) return true;
  }
  return false;
};

export default function ActivationGate({ children }) {
  const { user, profile } = useAuth();
  const [contract, setContract] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user) return;
      const snap = await getDocs(
        query(
          collection(db, COLLECTIONS.CONTRACTS),
          where("employeeId", "==", user.uid),
        ),
      );
      if (cancelled) return;
      const docs = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort(
          (a, b) =>
            (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0),
        );
      setContract(docs[0] || null);
      setChecking(false);
    })().catch(() => {
      if (!cancelled) setChecking(false);
    });
    return () => {
      cancelled = true;
    };
  }, [user, profile]);

  if (checking)
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner />
      </div>
    );

  const statusOk = [STATUS.APPROVED, STATUS.ACTIVE].includes(profile?.status);
  const missing = contract
    ? REQUIRED_FIELDS.filter((f) => !fieldIsSet(contract, f))
    : [];
  const ok = statusOk && !!contract && missing.length === 0;
  if (ok) return children;

  let reason;
  if (!statusOk) reason = "Your account is not yet approved by the admin.";
  else if (!contract) reason = "No contract linked — ask admin to create one.";
  else
    reason =
      "Admin has not yet finalised your contract. The following must be set before you can use the app:";

  return (
    <div className="bg-card rounded-lg shadow p-6 max-w-2xl">
      <h2 className="text-lg font-semibold text-primary mb-2">
        Account not yet activated
      </h2>
      <p className="text-sm text-muted-foreground mb-4">{reason}</p>
      {missing.length > 0 && (
        <ul className="list-disc pl-5 text-sm text-muted-foreground mb-4 space-y-1">
          {missing.map((f) => (
            <li key={f.key}>{f.label}</li>
          ))}
        </ul>
      )}
      <Link href="/employee/dashboard">
        <span className="inline-block bg-primary text-primary-foreground px-4 py-2 rounded-md cursor-pointer">
          Back to dashboard
        </span>
      </Link>
    </div>
  );
}
