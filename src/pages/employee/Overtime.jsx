// Employee overtime submission form.
import { useEffect, useState } from "react";
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
import { COLLECTIONS } from "../../lib/constants";
import { AUDIT, logAction } from "../../lib/audit";
import { Input, Textarea, Button, Alert, Card, PageHeader } from "../../lib/ui";
import Layout from "../../components/Layout";
import ActivationGate from "../../components/ActivationGate";
import MySubmissions from "../../components/MySubmissions";

export default function Overtime() {
  const { user, profile } = useAuth();
  const [contract, setContract] = useState(null);
  const [date, setDate] = useState("");
  const [hours, setHours] = useState("");
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

  const today = new Date().toISOString().slice(0, 10);

  // Submit overtime.
  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    setOk("");
    if (!contract) return setErr("No contract linked.");
    const h = Number(hours);
    if (!h || h <= 0 || h > 24)
      return setErr("Hours must be between 0 and 24.");
    setBusy(true);
    try {
      const ref = await addDoc(collection(db, COLLECTIONS.OVERTIME_RECORDS), {
        contractId: contract.id,
        employeeId: user.uid,
        employeeName: profile.fullName,
        employerId: contract.employerId,
        employerName: contract.employerName,
        date,
        hours: h,
        notes: notes.trim(),
        isHoliday: false,
        status: "pending",
        createdAt: serverTimestamp(),
      });
      logAction(AUDIT.OVERTIME_SUBMITTED, user.uid, profile?.role, {
        entryId: ref.id,
        hours: h,
      });
      setOk("Overtime submitted.");
      setDate("");
      setHours("");
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
        title="Log overtime"
        subtitle="Record overtime hours worked."
      />
      <ActivationGate>
        <Card className="max-w-6xl">
          <Alert tone="error">{err}</Alert>
          <Alert tone="success">{ok}</Alert>
          <form onSubmit={onSubmit} className="space-y-4">
            <Input
              label="Date"
              type="date"
              value={date}
              onChange={setDate}
              max={today}
              required
            />
            <Input
              label="Hours"
              type="number"
              step="0.5"
              min="0.5"
              max="24"
              value={hours}
              onChange={setHours}
              required
            />
            <Textarea
              label="Notes"
              value={notes}
              onChange={setNotes}
              rows={3}
            />
            <Button type="submit" disabled={busy}>
              {busy ? "Submitting…" : "Submit"}
            </Button>
          </form>
        </Card>
        <MySubmissions mode="overtime" />
      </ActivationGate>
    </Layout>
  );
}
