import {
  collection, addDoc, getDocs, doc, updateDoc,
  query, where, serverTimestamp,
} from "firebase/firestore";
import { db } from "../lib/firebase";

export const OVERTIME_TYPES = ["Overtime", "Working on Holiday"];

function sortDesc(docs, field = "date") {
  return docs.sort((a, b) => {
    const av = a[field] ?? "";
    const bv = b[field] ?? "";
    return bv > av ? 1 : bv < av ? -1 : 0;
  });
}

export async function submitOvertimeRecord(data) {
  const ref = await addDoc(collection(db, "overtimeRecords"), {
    ...data,
    status: "pending",
    createdAt: serverTimestamp(),
  });
  return { id: ref.id };
}

export async function getOvertimeByContract(contractId) {
  const snap = await getDocs(query(
    collection(db, "overtimeRecords"),
    where("contractId", "==", contractId)
  ));
  return sortDesc(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
}

export async function getOvertimeByEmployee(employeeId) {
  const snap = await getDocs(query(
    collection(db, "overtimeRecords"),
    where("employeeId", "==", employeeId)
  ));
  return sortDesc(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
}

export async function getOvertimeForEmployer(employerId) {
  const snap = await getDocs(query(
    collection(db, "overtimeRecords"),
    where("employerId", "==", employerId)
  ));
  return sortDesc(snap.docs.map((d) => ({ id: d.id, ...d.data() })), "createdAt");
}

export async function updateOvertimeStatus(recordId, status, approverId, approverEmail) {
  await updateDoc(doc(db, "overtimeRecords", recordId), {
    status,
    approverId,
    approverEmail,
    approvedAt: serverTimestamp(),
  });
}
