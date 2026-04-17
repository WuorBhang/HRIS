import { collection, addDoc, getDocs, query, orderBy, limit, serverTimestamp, where } from "firebase/firestore";
import { db } from "../lib/firebase";

export async function logAudit({ action, userId, userEmail, targetId = null, targetType = null, details = {} }) {
  try {
    await addDoc(collection(db, "auditLogs"), {
      action,
      userId,
      userEmail,
      targetId,
      targetType,
      details,
      createdAt: serverTimestamp(),
    });
  } catch (e) {
    console.warn("Audit log failed (non-blocking):", e.message);
  }
}

export async function getAuditLogs({ limitCount = 200, filterUserId = null } = {}) {
  // Use simple single-field orderBy (no compound index needed)
  const q = query(collection(db, "auditLogs"), orderBy("createdAt", "desc"), limit(limitCount));
  const snap = await getDocs(q);
  let docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  // Filter by userId client-side to avoid needing a composite index
  if (filterUserId) {
    docs = docs.filter((d) => d.userId === filterUserId);
  }
  return docs;
}
