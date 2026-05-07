// Employer leave-request review (approve / reject).
import { useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../lib/firebase";
import { COLLECTIONS } from "../../lib/constants";
import { formatDate } from "../../lib/utils";
import { AUDIT, logAction } from "../../lib/audit";
import { Button, Card, PageHeader } from "../../lib/ui";
import Layout from "../../components/Layout";

const TABS = ["pending", "approved", "rejected"];

export default function LeaveRequests() {
  const { user, profile } = useAuth();
  const [items, setItems] = useState([]);
  const [tab, setTab] = useState("pending");

  useEffect(() => {
    if (!user) return;
    return onSnapshot(
      query(
        collection(db, COLLECTIONS.LEAVE_REQUESTS),
        where("employerId", "==", user.uid),
      ),
      (s) => setItems(s.docs.map((d) => ({ id: d.id, ...d.data() }))),
      () => {},
    );
  }, [user]);

  const filtered = useMemo(
    () => items.filter((i) => i.status === tab),
    [items, tab],
  );

  // Decide handler.
  const decide = async (l, status) => {
    await updateDoc(doc(db, COLLECTIONS.LEAVE_REQUESTS, l.id), {
      status,
      decidedAt: serverTimestamp(),
      decidedBy: user.uid,
    });
    logAction(
      status === "approved" ? AUDIT.LEAVE_APPROVED : AUDIT.LEAVE_REJECTED,
      user.uid,
      profile?.role,
      { leaveId: l.id, employeeId: l.employeeId, type: l.type },
    );
  };

  return (
    <Layout>
      <PageHeader
        title="Leave requests"
        subtitle="Approve or reject employee leave."
      />
      <div className="flex gap-1 border-b border-border mb-4">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm capitalize ${tab === t ? "text-primary border-b-2 border-primary font-semibold" : "text-muted-foreground"}`}
          >
            {t} {items.filter((i) => i.status === t).length}
          </button>
        ))}
      </div>
      <Card>
        {!filtered.length ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            No {tab} requests.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((l) => (
              <li key={l.id} className="py-3 flex flex-wrap items-center gap-3">
                <div className="flex-1 min-w-[200px]">
                  <div className="font-medium">
                    {l.employeeName} · {l.type}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {l.days}d · {formatDate(l.startDate)} →{" "}
                    {formatDate(l.endDate)}
                  </div>
                  {l.notes && (
                    <div className="text-xs italic text-muted-foreground mt-1">
                      "{l.notes}"
                    </div>
                  )}
                </div>
                {tab === "pending" && (
                  <div className="flex gap-2">
                    <Button onClick={() => decide(l, "approved")}>
                      Approve
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => decide(l, "rejected")}
                    >
                      Reject
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </Layout>
  );
}
