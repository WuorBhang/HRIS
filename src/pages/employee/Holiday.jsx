// Employee holiday-work submission.
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
import { subscribeHolidays } from "../../lib/holidayService";
import { formatDate } from "../../lib/utils";
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
import MySubmissions from "../../components/MySubmissions";
import UpcomingHolidays from "../../components/UpcomingHolidays";

export default function Holiday() {
  const { user, profile } = useAuth();
  const [contract, setContract] = useState(null);
  const [holidays, setHolidays] = useState([]);
  const [holidayId, setHolidayId] = useState("");
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

  useEffect(() => subscribeHolidays(setHolidays), []);

  // Submit holiday work.
  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    setOk("");
    const h = holidays.find((x) => x.id === holidayId);
    if (!contract) return setErr("No contract linked.");
    if (!h) return setErr("Pick a public holiday.");
    const hr = Number(hours);
    if (!hr || hr <= 0 || hr > 24) return setErr("Hours must be 0–24.");
    setBusy(true);
    try {
      const ref = await addDoc(collection(db, COLLECTIONS.OVERTIME_RECORDS), {
        contractId: contract.id,
        employeeId: user.uid,
        employeeName: profile.fullName,
        employerId: contract.employerId,
        employerName: contract.employerName,
        date: h.date,
        hours: hr,
        notes: notes.trim(),
        isHoliday: true,
        holidayName: h.name,
        status: "pending",
        createdAt: serverTimestamp(),
      });
      logAction(AUDIT.HOLIDAY_WORK_SUBMITTED, user.uid, profile?.role, {
        entryId: ref.id,
        holiday: h.name,
        hours: hr,
      });
      setOk("Holiday work submitted.");
      setHolidayId("");
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
        title="Holiday work"
        subtitle="Submit hours worked on a public holiday."
      />
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <Alert tone="error">{err}</Alert>
            <Alert tone="success">{ok}</Alert>
            <form onSubmit={onSubmit} className="space-y-4">
              <Select
                label="Public holiday"
                value={holidayId}
                onChange={setHolidayId}
                required
              >
                <option value="">Pick a holiday…</option>
                {holidays.map((h) => (
                  <option key={h.id} value={h.id}>
                    {formatDate(h.date)} — {h.name}
                  </option>
                ))}
              </Select>
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
          <MySubmissions mode="holiday" />
        </div>
        <UpcomingHolidays />
      </div>
    </Layout>
  );
}
