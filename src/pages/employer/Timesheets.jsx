// Employer timesheet review (overtime + holiday work).
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
import { Button, Select, Card, PageHeader } from "../../lib/ui";
import Layout from "../../components/Layout";

const TABS = ["pending", "approved", "rejected"];

export default function Timesheets() {
  const { user, profile } = useAuth();
  const [items, setItems] = useState([]);
  const [tab, setTab] = useState("pending");
  const [type, setType] = useState("all");

  useEffect(() => {
    if (!user) return;
    return onSnapshot(
      query(
        collection(db, COLLECTIONS.OVERTIME_RECORDS),
        where("employerId", "==", user.uid),
      ),
      (s) => setItems(s.docs.map((d) => ({ id: d.id, ...d.data() }))),
      () => {},
    );
  }, [user]);

  const filtered = useMemo(
    () =>
      items.filter(
        (i) =>
          i.status === tab &&
          (type === "all" || (type === "holiday" ? i.isHoliday : !i.isHoliday)),
      ),
    [items, tab, type],
  );

  // Decide entry.
  const decide = async (it, status) => {
    await updateDoc(doc(db, COLLECTIONS.OVERTIME_RECORDS, it.id), {
      status,
      decidedAt: serverTimestamp(),
      decidedBy: user.uid,
    });
    const action = it.isHoliday
      ? status === "approved"
        ? AUDIT.HOLIDAY_WORK_APPROVED
        : AUDIT.HOLIDAY_WORK_REJECTED
      : status === "approved"
        ? AUDIT.OVERTIME_APPROVED
        : AUDIT.OVERTIME_REJECTED;
    logAction(action, user.uid, profile?.role, {
      entryId: it.id,
      employeeId: it.employeeId,
      hours: it.hours,
    });
  };

  return (
    <Layout>
      <PageHeader
        title="Timesheets"
        subtitle="Approve overtime and holiday work."
      />
      <div className="flex flex-wrap gap-3 items-end mb-4">
        <div className="flex gap-1 border-b border-border flex-1">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm capitalize ${tab === t ? "text-primary border-b-2 border-primary font-semibold" : "text-muted-foreground"}`}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="w-40">
          <Select
            value={type}
            onChange={setType}
            options={[
              { value: "all", label: "All" },
              { value: "overtime", label: "Overtime" },
              { value: "holiday", label: "Holiday" },
            ]}
          />
        </div>
      </div>
      <Card>
        {!filtered.length ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            Nothing here.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((it) => (
              <li
                key={it.id}
                className="py-3 flex flex-wrap items-center gap-3"
              >
                <div className="flex-1 min-w-[200px]">
                  <div className="font-medium">
                    {it.employeeName} ·{" "}
                    {it.isHoliday ? "Holiday work" : "Overtime"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {it.hours}h · {formatDate(it.date)}
                    {it.holidayName ? ` — ${it.holidayName}` : ""}
                  </div>
                  {it.notes && (
                    <div className="text-xs italic text-muted-foreground mt-1">
                      "{it.notes}"
                    </div>
                  )}
                </div>
                {tab === "pending" && (
                  <div className="flex gap-2">
                    <Button onClick={() => decide(it, "approved")}>
                      Approve
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => decide(it, "rejected")}
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
