import { useEffect, useState } from "react";
import { Link } from "wouter";
import { collection, getDocs, query, where } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { db } from "../lib/firebase";
import { COLLECTIONS, STATUS } from "../lib/constants";
import Spinner from "./Spinner";

const DEBUG = import.meta.env.DEV;

/**
 * Wraps employee form pages and only renders children once:
 *  - the user's profile status is approved/active, AND
 *  - the user has at least one contract linked.
 * Otherwise, shows a clear blocking message.
 */
export default function ActivationGate({ children }) {
  const { user, profile } = useAuth();
  const [contract, setContract] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user) return;
      setChecking(true);
      try {
        const snap = await getDocs(
          query(
            collection(db, COLLECTIONS.CONTRACTS),
            where("employeeId", "==", user.uid),
          ),
        );
        if (cancelled) return;
        const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        docs.sort(
          (a, b) =>
            (b.createdAt?.toMillis?.() ?? 0) -
            (a.createdAt?.toMillis?.() ?? 0),
        );
        const c = docs[0] || null;
        setContract(c);
        if (DEBUG) {
          // eslint-disable-next-line no-console
          console.log("[ActivationGate]", {
            uid: user.uid,
            role: profile?.role,
            status: profile?.status,
            hasContract: !!c,
            contractId: c?.id,
          });
        }
      } catch (err) {
        if (cancelled) return;
        // eslint-disable-next-line no-console
        console.error("[ActivationGate] contract lookup failed:", err);
        setContract(null);
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, profile]);

  if (checking) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner />
      </div>
    );
  }

  const statusOk =
    profile?.status === STATUS.APPROVED || profile?.status === STATUS.ACTIVE;
  const passes = statusOk && !!contract;

  if (DEBUG) {
    // eslint-disable-next-line no-console
    console.log("[ActivationGate] gate result:", {
      statusOk,
      hasContract: !!contract,
      passes,
    });
  }

  if (!passes) {
    return (
      <div className="bg-card rounded-lg shadow p-6 max-w-2xl">
        <h2 className="text-lg font-semibold text-primary mb-2">
          Account not yet activated
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          {!statusOk
            ? "Your account is not yet approved by the admin."
            : "You haven't been linked to an employer through a contract yet. Please ask the admin to create your contract."}
        </p>
        <Link href="/employee/dashboard">
          <span className="inline-block bg-primary text-primary-foreground px-4 py-2 rounded-md cursor-pointer">
            Back to dashboard
          </span>
        </Link>
      </div>
    );
  }

  return children;
}
