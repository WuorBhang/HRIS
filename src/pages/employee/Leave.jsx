// Employee leave request form.
import { useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  getDocs,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../lib/firebase";
import { COLLECTIONS, LEAVE_TYPES } from "../../lib/constants";
import { AUDIT, logAction } from "../../lib/audit";
import {
  Input,
  Textarea,
  Select,
  Button,
  Alert,
  Card,
  PageHeader,
} from "../../lib/ui";
import Layout from "../../components/Layout";
import ActivationGate from "../../components/ActivationGate";
import MySubmissions from "../../components/MySubmissions";

// Inclusive day count.
const dayCount = (s, e) => {
  if (!s || !e) return 0;
  const ms = new Date(e) - new Date(s);
  return ms >= 0 ? Math.floor(ms / 86400000) + 1 : 0;
};

export default function Leave() {
  const { user, profile } = useAuth();
  const [contract, setContract] = useState(null);
  const [type, setType] = useState(LEAVE_TYPES[0]);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [notes, setNotes] = useState("");
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    getDocs(
      query(
        collection(db, COLLECTIONS.CONTRACTS),
        where("employeeId", "==", user.uid),
      ),
    )
      .then((s) => {
        const docs = s.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort(
            (a, b) =>
              (b.createdAt?.toMillis?.() || 0) -
              (a.createdAt?.toMillis?.() || 0),
          );
        setContract(docs[0] || null);
      })
      .catch(() => {});
  }, [user]);

  const days = useMemo(() => dayCount(start, end), [start, end]);

  // Submit handler.
  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    setOk("");
    if (!contract) return setErr("No contract linked.");
    if (days <= 0) return setErr("End date must be on or after start date.");
    if (type === "Sick" && !notes.trim())
      return setErr("Please add notes for sick leave.");
    setBusy(true);
    try {
      const ref = await addDoc(collection(db, COLLECTIONS.LEAVE_REQUESTS), {
        contractId: contract.id,
        employeeId: user.uid,
        employeeName: profile.fullName,
        employerId: contract.employerId,
        employerName: contract.employerName,
        type,
        startDate: start,
        endDate: end,
        days,
        notes: notes.trim(),
        status: "pending",
        createdAt: serverTimestamp(),
      });
      logAction(AUDIT.LEAVE_SUBMITTED, user.uid, profile?.role, {
        leaveId: ref.id,
        type,
        days,
      });
      setOk("Leave request submitted.");
      setStart("");
      setEnd("");
      setNotes("");
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Layout>
      <PageHeader
        title="Request leave"
        subtitle="Submit a new leave request."
      />
      <ActivationGate>
        <Card className="max-w-6xl">
          <Alert tone="error">{err}</Alert>
          <Alert tone="success">{ok}</Alert>
          <form onSubmit={onSubmit} className="space-y-4">
            <Select
              label="Type"
              value={type}
              onChange={setType}
              options={LEAVE_TYPES}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Start"
                type="date"
                value={start}
                onChange={setStart}
                required
              />
              <Input
                label="End"
                type="date"
                value={end}
                onChange={setEnd}
                required
              />
            </div>
            {days > 0 && (
              <div className="text-sm text-muted-foreground">
                {days} day{days === 1 ? "" : "s"}
              </div>
            )}
            <Textarea
              label={`Notes${type === "Sick" ? " (required)" : ""}`}
              value={notes}
              onChange={setNotes}
              rows={3}
            />
            <Button type="submit" disabled={busy}>
              {busy ? "Submitting…" : "Submit request"}
            </Button>
          </form>
        </Card>
        <MySubmissions mode="leave" />
      </ActivationGate>
    </Layout>
  );
}
