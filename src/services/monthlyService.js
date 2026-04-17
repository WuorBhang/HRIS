import {
  collection, addDoc, getDocs, doc, updateDoc,
  query, where, serverTimestamp,
} from "firebase/firestore";
import { db } from "../lib/firebase";

function sortDescByMonth(docs) {
  return docs.sort((a, b) => (b.month ?? "").localeCompare(a.month ?? ""));
}

export async function getOrCreateMonthlyRecord(contractId, month) {
  const snap = await getDocs(query(
    collection(db, "monthlyRecords"),
    where("contractId", "==", contractId),
    where("month", "==", month)
  ));
  if (!snap.empty) return { id: snap.docs[0].id, ...snap.docs[0].data() };

  const ref = await addDoc(collection(db, "monthlyRecords"), {
    contractId,
    month,
    status: "open",
    approved: false,
    locked: false,
    createdAt: serverTimestamp(),
  });
  return { id: ref.id, contractId, month, status: "open", approved: false, locked: false };
}

export async function getMonthlyRecordsByContract(contractId) {
  const snap = await getDocs(query(
    collection(db, "monthlyRecords"),
    where("contractId", "==", contractId)
  ));
  return sortDescByMonth(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
}

export async function getMonthlyRecordsForEmployer(employerId) {
  const snap = await getDocs(query(
    collection(db, "monthlyRecords"),
    where("employerId", "==", employerId)
  ));
  return sortDescByMonth(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
}

export async function approveMonth(recordId, approverId, approverEmail) {
  await updateDoc(doc(db, "monthlyRecords", recordId), {
    status: "approved",
    approved: true,
    locked: true,
    approverId,
    approverEmail,
    approvedAt: serverTimestamp(),
  });
}

export async function unlockMonth(recordId, adminId, reason) {
  await updateDoc(doc(db, "monthlyRecords", recordId), {
    status: "open",
    locked: false,
    unlockReason: reason,
    unlockedBy: adminId,
    unlockedAt: serverTimestamp(),
  });
}
