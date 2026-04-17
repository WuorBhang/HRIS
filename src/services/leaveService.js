import {
  collection, addDoc, getDocs, doc, updateDoc,
  query, where, serverTimestamp,
} from "firebase/firestore";
import { db } from "../lib/firebase";

export const LEAVE_TYPES = ["Paid Leave", "Sick Leave", "Compassionate Leave"];
export const LEAVE_STATUS = { PENDING: "pending", APPROVED: "approved", REJECTED: "rejected" };

function sortDesc(docs, field = "createdAt") {
  return docs.sort((a, b) => {
    const av = a[field]?.seconds ?? 0;
    const bv = b[field]?.seconds ?? 0;
    return bv - av;
  });
}

export async function submitLeaveRequest(data) {
  const ref = await addDoc(collection(db, "leaveRequests"), {
    ...data,
    status: "pending",
    createdAt: serverTimestamp(),
  });
  return { id: ref.id };
}

export async function getLeaveRequestsByContract(contractId) {
  const snap = await getDocs(query(
    collection(db, "leaveRequests"),
    where("contractId", "==", contractId)
  ));
  return sortDesc(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
}

export async function getLeaveRequestsByEmployee(employeeId) {
  const snap = await getDocs(query(
    collection(db, "leaveRequests"),
    where("employeeId", "==", employeeId)
  ));
  return sortDesc(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
}

export async function getPendingLeaveForEmployer(employerId) {
  const snap = await getDocs(query(
    collection(db, "leaveRequests"),
    where("employerId", "==", employerId),
    where("status", "==", "pending")
  ));
  return sortDesc(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
}

export async function getLeaveForEmployer(employerId) {
  const snap = await getDocs(query(
    collection(db, "leaveRequests"),
    where("employerId", "==", employerId)
  ));
  return sortDesc(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
}

export async function updateLeaveStatus(leaveId, status, approverId, approverEmail, note = "") {
  await updateDoc(doc(db, "leaveRequests", leaveId), {
    status,
    approverId,
    approverEmail,
    approvedAt: serverTimestamp(),
    approvalNote: note,
  });
}
