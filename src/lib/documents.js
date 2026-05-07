// Document upload/delete via Supabase Storage + Firestore metadata.
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { db } from "./firebase";
import { supabase, BUCKETS } from "./supabase";
import { COLLECTIONS, MAX_DOCUMENT_BYTES, MONTHLY_TYPES } from "./constants";

const ALLOWED = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/csv",
];

// File type check.
const allowed = (f) =>
  f && (f.type?.startsWith("image/") || ALLOWED.includes(f.type));

// Sanitize filename.
const safe = (n) => n.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 120) || "file";

// Human size string.
export const humanFileSize = (b) => {
  if (!Number.isFinite(b) || b <= 0) return "—";
  const u = ["B", "KB", "MB", "GB"];
  let i = 0,
    n = b;
  while (n >= 1024 && i < u.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(n < 10 && i > 0 ? 1 : 0)} ${u[i]}`;
};

// Upload contract-scoped document.
export const uploadContractDocument = async ({
  contract,
  file,
  type,
  month,
  title,
  uploadedBy,
}) => {
  if (!contract?.id) throw new Error("Pick a contract.");
  if (!file) throw new Error("Pick a file.");
  if (!type) throw new Error("Pick a document type.");
  if (!uploadedBy) throw new Error("Sign in required.");
  if (!allowed(file)) throw new Error("Unsupported file type.");
  if (file.size > MAX_DOCUMENT_BYTES)
    throw new Error(`Max size ${humanFileSize(MAX_DOCUMENT_BYTES)}.`);
  if (
    MONTHLY_TYPES.includes(type) &&
    !/^\d{4}-(0[1-9]|1[0-2])$/.test(month || "")
  )
    throw new Error("Month required (YYYY-MM).");

  const path = `contracts/${contract.id}/${Date.now()}_${safe(file.name)}`;
  const contentType = file.type || "application/octet-stream";
  const { error } = await supabase.storage
    .from(BUCKETS.DOCUMENTS)
    .upload(path, file, { contentType, upsert: false });
  if (error)
    throw new Error(
      error.message?.includes("row-level security")
        ? "Supabase blocked upload — check 'documents' bucket policies."
        : error.message || "Upload failed.",
    );
  const url =
    supabase.storage.from(BUCKETS.DOCUMENTS).getPublicUrl(path).data
      ?.publicUrl || "";

  const ref = await addDoc(collection(db, COLLECTIONS.DOCUMENTS), {
    contractId: contract.id,
    contractNo: contract.contractNo || "",
    contractNumber: contract.contractNumber || null,
    employerId: contract.employerId || "",
    employeeId: contract.employeeId || "",
    employerName: contract.employerName || "",
    employeeName: contract.employeeName || "",
    ownerId: contract.employeeId || "",
    type,
    month: month || "",
    title: (title || file.name).trim().slice(0, 200),
    fileName: file.name,
    contentType,
    size: file.size,
    storagePath: path,
    storageBucket: BUCKETS.DOCUMENTS,
    storageProvider: "supabase",
    url,
    downloadURL: url,
    uploadedBy,
    uploadedAt: serverTimestamp(),
  });
  return { id: ref.id, url };
};

// Delete document (Storage + Firestore).
export const deleteContractDocument = async (d) => {
  if (!d?.id) return;
  if (d.storagePath)
    await supabase.storage
      .from(d.storageBucket || BUCKETS.DOCUMENTS)
      .remove([d.storagePath])
      .catch(() => {});
  await deleteDoc(doc(db, COLLECTIONS.DOCUMENTS, d.id));
};

// Subscribe to employer's documents (sorted client-side to avoid the
// composite index requirement of where + orderBy).
export const subscribeDocumentsForEmployer = (uid, cb) => {
  if (!uid) return () => {};
  return onSnapshot(
    query(
      collection(db, COLLECTIONS.DOCUMENTS),
      where("employerId", "==", uid),
    ),
    (s) =>
      cb(
        s.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort(
            (a, b) =>
              (b.uploadedAt?.toMillis?.() || 0) -
              (a.uploadedAt?.toMillis?.() || 0),
          ),
      ),
    () => cb([]),
  );
};

// Subscribe to contract documents (sorted client-side).
export const subscribeDocumentsForContract = (cid, cb) => {
  if (!cid) return () => {};
  return onSnapshot(
    query(
      collection(db, COLLECTIONS.DOCUMENTS),
      where("contractId", "==", cid),
    ),
    (s) =>
      cb(
        s.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort(
            (a, b) =>
              (b.uploadedAt?.toMillis?.() || 0) -
              (a.uploadedAt?.toMillis?.() || 0),
          ),
      ),
    () => cb([]),
  );
};
