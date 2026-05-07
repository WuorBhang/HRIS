// Blocks employee pages until account active + contract linked.
import { useEffect, useState } from "react";
import { Link } from "wouter";
import { collection, getDocs, query, where } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { db } from "../lib/firebase";
import { COLLECTIONS, STATUS } from "../lib/constants";
import Spinner from "./Spinner";

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

  const ok =
    [STATUS.APPROVED, STATUS.ACTIVE].includes(profile?.status) && !!contract;
  if (ok) return children;

  return (
    <div className="bg-card rounded-lg shadow p-6 max-w-2xl">
      <h2 className="text-lg font-semibold text-primary mb-2">
        Account not yet activated
      </h2>
      <p className="text-sm text-muted-foreground mb-4">
        {![STATUS.APPROVED, STATUS.ACTIVE].includes(profile?.status)
          ? "Your account is not yet approved by the admin."
          : "No contract linked — ask admin to create one."}
      </p>
      <Link href="/employee/dashboard">
        <span className="inline-block bg-primary text-primary-foreground px-4 py-2 rounded-md cursor-pointer">
          Back to dashboard
        </span>
      </Link>
    </div>
  );
}
