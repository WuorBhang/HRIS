import {
  collection, addDoc, getDocs, getDoc, doc, updateDoc,
  query, where, serverTimestamp, orderBy,
} from "firebase/firestore";
import { db } from "../lib/firebase";

function sortDesc(docs, field = "createdAt") {
  return docs.sort((a, b) => {
    const av = a[field]?.seconds ?? 0;
    const bv = b[field]?.seconds ?? 0;
    return bv - av;
  });
}

export async function createContract(data) {
  const ref = await addDoc(collection(db, "contracts"), {
    ...data,
    status: "active",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return { id: ref.id, ...data };
}

export async function getContractsByEmployer(employerId) {
  const snap = await getDocs(query(
    collection(db, "contracts"),
    where("employerId", "==", employerId)
  ));
  return sortDesc(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
}

export async function getContractsByEmployee(employeeId) {
  const snap = await getDocs(query(
    collection(db, "contracts"),
    where("employeeId", "==", employeeId)
  ));
  return sortDesc(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
}

export async function getAllContracts() {
  const q = query(collection(db, "contracts"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getContract(contractId) {
  const snap = await getDoc(doc(db, "contracts", contractId));
  if (!snap.exists()) throw new Error("Contract not found");
  return { id: snap.id, ...snap.data() };
}

export async function updateContract(contractId, data) {
  await updateDoc(doc(db, "contracts", contractId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function adjustLeaveBalance(contractId, balances) {
  await updateDoc(doc(db, "contracts", contractId), {
    leaveBalances: balances,
    updatedAt: serverTimestamp(),
  });
}
