import {
  collection, addDoc, getDocs, doc, updateDoc,
  query, where, serverTimestamp, orderBy,
} from "firebase/firestore";
import { db } from "../lib/firebase";

export const ADVANCE_STATUSES = ["pending", "approved", "rejected"];

function sortDesc(docs) {
  return docs.sort((a, b) => {
    const av = a.createdAt?.seconds ?? 0;
    const bv = b.createdAt?.seconds ?? 0;
    return bv - av;
  });
}

export async function requestSalaryAdvance(data) {
  const ref = await addDoc(collection(db, "salaryAdvances"), {
    ...data,
    status: "pending",
    createdAt: serverTimestamp(),
  });
  return { id: ref.id };
}

export async function getSalaryAdvancesByContract(contractId) {
  const snap = await getDocs(query(
    collection(db, "salaryAdvances"),
    where("contractId", "==", contractId)
  ));
  return sortDesc(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
}

export async function getSalaryAdvancesByEmployee(employeeId) {
  const snap = await getDocs(query(
    collection(db, "salaryAdvances"),
    where("employeeId", "==", employeeId)
  ));
  return sortDesc(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
}

export async function getAllSalaryAdvances() {
  const q = query(collection(db, "salaryAdvances"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function updateAdvanceStatus(advanceId, status, reviewerId, reviewerEmail) {
  await updateDoc(doc(db, "salaryAdvances", advanceId), {
    status,
    reviewerId,
    reviewerEmail,
    reviewedAt: serverTimestamp(),
  });
}
