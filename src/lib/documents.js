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
import { supabase, SUPABASE_BUCKETS } from "./supabase";
import { COLLECTIONS, MAX_DOCUMENT_BYTES } from "./constants";

// MIME types we accept for the documents feature. PDFs, common Office
// formats, and any image. Anything else is rejected client-side.
const ALLOWED_MIME = [
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

export function isAllowedDocumentType(file) {
  if (!file) return false;
  if (file.type?.startsWith("image/")) return true;
  return ALLOWED_MIME.includes(file.type);
}

// Strip anything that isn't safe in a Storage object name.
function safeName(name) {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 120) || "file";
}

export function humanFileSize(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(n < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
}

// File extension → category icon hint, returned as a short label so the
// UI can colour or icon it as it likes.
export function fileKindLabel(contentType, fileName = "") {
  if (contentType?.startsWith("image/")) return "Image";
  if (contentType === "application/pdf") return "PDF";
  if (contentType?.includes("word") || /\.docx?$/i.test(fileName)) return "Word";
  if (contentType?.includes("sheet") || /\.xlsx?$/i.test(fileName)) return "Excel";
  if (
    contentType?.includes("presentation") ||
    /\.pptx?$/i.test(fileName)
  )
    return "Slides";
  if (contentType === "text/csv") return "CSV";
  if (contentType === "text/plain") return "Text";
  return "File";
}

/**
 * Upload a single document to the Supabase `documents` bucket and create
 * a matching Firestore record. Returns the new Firestore document id.
 *
 *   onProgress(percent) — optional. The Supabase JS client does not expose
 *   per-byte progress so we fire 10% on start and 100% on completion just
 *   to keep the UI's progress bar contract intact.
 */
export async function uploadDocument({
  file,
  owner,            // { id, fullName, email, role }
  uploader,         // { id, fullName }
  category,
  title,
  onProgress,
}) {
  if (!file) throw new Error("Pick a file to upload.");
  if (!owner?.id) throw new Error("Pick the user this document is for.");
  if (!uploader?.id) throw new Error("You must be signed in to upload.");
  if (!isAllowedDocumentType(file)) {
    throw new Error(
      "Unsupported file type. Use PDF, Word, Excel, PowerPoint, or an image.",
    );
  }
  if (file.size > MAX_DOCUMENT_BYTES) {
    throw new Error(
      `File is too large. Maximum size is ${humanFileSize(MAX_DOCUMENT_BYTES)}.`,
    );
  }

  // Prefix the filename with a timestamp so uploading two files with the
  // same name doesn't overwrite the first one in Storage.
  const objectName = `${Date.now()}_${safeName(file.name)}`;
  const storagePath = `${owner.id}/${objectName}`;
  const contentType = file.type || "application/octet-stream";

  onProgress?.(10);

  const { error: upErr } = await supabase.storage
    .from(SUPABASE_BUCKETS.DOCUMENTS)
    .upload(storagePath, file, { contentType, upsert: false });

  if (upErr) {
    throw new Error(
      upErr.message?.includes("row-level security")
        ? "Supabase blocked the upload. Make sure the 'documents' bucket exists and allows uploads (see SUPABASE_SETUP.md)."
        : upErr.message || "Upload failed.",
    );
  }

  onProgress?.(100);

  const { data: pub } = supabase.storage
    .from(SUPABASE_BUCKETS.DOCUMENTS)
    .getPublicUrl(storagePath);
  const downloadURL = pub?.publicUrl || "";

  const docRef = await addDoc(collection(db, COLLECTIONS.DOCUMENTS), {
    ownerId: owner.id,
    ownerName: owner.fullName || "",
    ownerEmail: owner.email || "",
    ownerRole: owner.role || "",
    category: category || "other",
    title: (title || file.name).trim().slice(0, 200),
    fileName: file.name,
    contentType,
    size: file.size,
    storagePath,
    storageBucket: SUPABASE_BUCKETS.DOCUMENTS,
    storageProvider: "supabase",
    downloadURL,
    uploadedBy: uploader.id,
    uploadedByName: uploader.fullName || "",
    uploadedAt: serverTimestamp(),
  });

  return docRef.id;
}

// ---------------------------------------------------------------------------
// Document type catalogue
// ---------------------------------------------------------------------------
// Top-level "kinds" of artefacts the system stores. The first three (PAYSLIP,
// STATUTORY, PAYROLL_SUMMARY) are *monthly records*: every record is tied to
// a specific contract and a single month. The rest are one-off documents.

export const DOCUMENT_TYPES = Object.freeze({
  PAYSLIP: "payslip",
  STATUTORY: "statutory",
  PAYROLL_SUMMARY: "payroll_summary",
  CONTRACT: "contract",
  ID: "id",
  POLICY: "policy",
  OTHER: "other",
});

// Document types that MUST carry a contractId and a YYYY-MM month string.
export const MONTHLY_RECORD_TYPES = Object.freeze([
  DOCUMENT_TYPES.PAYSLIP,
  DOCUMENT_TYPES.STATUTORY,
  DOCUMENT_TYPES.PAYROLL_SUMMARY,
]);

export function isMonthlyRecordType(type) {
  return MONTHLY_RECORD_TYPES.includes(type);
}

/**
 * Shape contract for documents stored in Firestore.
 *
 * Each entry: { required, type, description }
 * `type` is a JS typeof string (or "string-yyyy-mm" for the month field).
 * Used by validateDocumentRecord() and as living documentation.
 */
export const DOCUMENT_SCHEMA = Object.freeze({
  type: { required: true, type: "string", description: "One of DOCUMENT_TYPES." },
  ownerId: { required: true, type: "string", description: "User this document belongs to." },
  contractId: {
    required: "monthly", // required only for monthly-record types
    type: "string",
    description: "Contract this record is scoped to (required for payslip / statutory / payroll_summary).",
  },
  month: {
    required: "monthly",
    type: "string-yyyy-mm",
    description: "YYYY-MM the record covers (required for monthly-record types).",
  },
  title: { required: true, type: "string", description: "Human-readable title." },
  storagePath: { required: true, type: "string", description: "Object key in the Supabase bucket." },
  uploadedBy: { required: true, type: "string", description: "UID of the uploader." },
});

/**
 * Format a Date (or ISO date string) as "YYYY-MM" using local time.
 * Returns "" if the input is invalid.
 */
export function formatMonth(input) {
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

const YYYY_MM_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

export function isValidMonth(value) {
  return typeof value === "string" && YYYY_MM_RE.test(value);
}

/**
 * Validate a Firestore document record against DOCUMENT_SCHEMA.
 *
 * For any type listed in MONTHLY_RECORD_TYPES this *rejects* records that
 * have a null/empty contractId or month — Sprint 3's payslip/statutory
 * pipeline depends on every monthly artefact being scoped to a contract
 * AND a single YYYY-MM bucket.
 *
 * Returns: { ok: boolean, errors: string[] }
 */
export function validateDocumentRecord(record) {
  const errors = [];
  if (!record || typeof record !== "object") {
    return { ok: false, errors: ["Record must be an object."] };
  }

  const requireString = (key) => {
    const v = record[key];
    if (typeof v !== "string" || v.trim() === "") {
      errors.push(`Field "${key}" is required and must be a non-empty string.`);
    }
  };

  requireString("type");
  requireString("ownerId");
  requireString("title");
  requireString("storagePath");
  requireString("uploadedBy");

  if (typeof record.type === "string" && isMonthlyRecordType(record.type)) {
    if (record.contractId == null || record.contractId === "") {
      errors.push(
        `Field "contractId" is required for "${record.type}" records (cannot be null or empty).`,
      );
    } else if (typeof record.contractId !== "string") {
      errors.push('Field "contractId" must be a string.');
    }

    if (record.month == null || record.month === "") {
      errors.push(
        `Field "month" is required for "${record.type}" records (cannot be null or empty).`,
      );
    } else if (!isValidMonth(record.month)) {
      errors.push('Field "month" must be a "YYYY-MM" string (e.g. "2026-04").');
    }
  }

  return { ok: errors.length === 0, errors };
}

/** Delete both the Firestore record and the Supabase Storage object. */
export async function deleteDocument(docRecord) {
  if (!docRecord?.id) return;
  // Delete the Storage object first; if it's already missing don't block
  // the Firestore cleanup.
  if (docRecord.storagePath) {
    try {
      const bucket = docRecord.storageBucket || SUPABASE_BUCKETS.DOCUMENTS;
      const { error } = await supabase.storage
        .from(bucket)
        .remove([docRecord.storagePath]);
      if (error) {
        // eslint-disable-next-line no-console
        console.warn("[documents] storage delete failed:", error);
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn("[documents] storage delete failed:", err);
    }
  }
  await deleteDoc(doc(db, COLLECTIONS.DOCUMENTS, docRecord.id));
}

// ---------------------------------------------------------------------------
// Contract-scoped documents (admin Documents page + employer/employee views)
// ---------------------------------------------------------------------------
// These records always carry { contractId, employerId, employeeId, type,
// month, title } so the UI can filter by contract and group by month.
// `ownerId` is set to the employee's uid so the existing per-owner read
// rule (documents.ownerId == auth.uid) lets the employee see their files
// without rule changes. Employer/admin reads are gated by employerId in
// the updated firestore.rules.

/**
 * Upload a document tied to a specific contract (employer ↔ employee link).
 *
 * @param {object} params
 * @param {object} params.contract   The full contract document.
 * @param {File}   params.file       The file the user picked.
 * @param {string} params.type       One of DOCUMENT_TYPES.
 * @param {string} params.month      "YYYY-MM" the document covers.
 * @param {string} [params.title]    Optional title (defaults to filename).
 * @param {string} params.uploadedBy uid of the uploader (admin/employer).
 * @returns {Promise<{ id: string, url: string }>}
 */
export async function uploadContractDocument({
  contract,
  file,
  type,
  month,
  title,
  uploadedBy,
}) {
  if (!contract?.id) throw new Error("Pick a contract.");
  if (!file) throw new Error("Pick a file to upload.");
  if (!type) throw new Error("Pick a document type.");
  if (!uploadedBy) throw new Error("You must be signed in to upload.");
  if (!isAllowedDocumentType(file)) {
    throw new Error(
      "Unsupported file type. Use PDF, Word, Excel, PowerPoint, or an image.",
    );
  }
  if (file.size > MAX_DOCUMENT_BYTES) {
    throw new Error(
      `File is too large. Maximum size is ${humanFileSize(MAX_DOCUMENT_BYTES)}.`,
    );
  }
  if (isMonthlyRecordType(type) && !isValidMonth(month)) {
    throw new Error('Month is required and must be "YYYY-MM".');
  }

  // Object key: contracts/<contractId>/<timestamp>_<safeFileName>
  const objectName = `${Date.now()}_${safeName(file.name)}`;
  const storagePath = `contracts/${contract.id}/${objectName}`;
  const contentType = file.type || "application/octet-stream";

  const { error: upErr } = await supabase.storage
    .from(SUPABASE_BUCKETS.DOCUMENTS)
    .upload(storagePath, file, { contentType, upsert: false });
  if (upErr) {
    throw new Error(
      upErr.message?.includes("row-level security")
        ? "Supabase blocked the upload. Make sure the 'documents' bucket exists and allows uploads (see SUPABASE_SETUP.md)."
        : upErr.message || "Upload failed.",
    );
  }

  const { data: pub } = supabase.storage
    .from(SUPABASE_BUCKETS.DOCUMENTS)
    .getPublicUrl(storagePath);
  const url = pub?.publicUrl || "";

  const ref = await addDoc(collection(db, COLLECTIONS.DOCUMENTS), {
    contractId: contract.id,
    employerId: contract.employerId || "",
    employeeId: contract.employeeId || "",
    employerName: contract.employerName || "",
    employeeName: contract.employeeName || "",
    // ownerId = employee so the existing per-owner read rule lets the
    // employee see their own files without rule changes.
    ownerId: contract.employeeId || "",
    type,
    month: month || "",
    title: (title || file.name).trim().slice(0, 200),
    fileName: file.name,
    contentType,
    size: file.size,
    storagePath,
    storageBucket: SUPABASE_BUCKETS.DOCUMENTS,
    storageProvider: "supabase",
    url,
    downloadURL: url,
    uploadedBy,
    uploadedAt: serverTimestamp(),
  });

  return { id: ref.id, url };
}

/** Delete a contract-scoped document (Storage + Firestore). */
export async function deleteContractDocument(docRecord) {
  return deleteDocument(docRecord);
}

/**
 * Subscribe to all contract-scoped documents for an employer, newest first.
 * Returns the unsubscribe function.
 */
export function subscribeDocumentsForEmployer(employerUid, cb) {
  if (!employerUid) return () => {};
  const q = query(
    collection(db, COLLECTIONS.DOCUMENTS),
    where("employerId", "==", employerUid),
    orderBy("uploadedAt", "desc"),
  );
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    () => cb([]),
  );
}

/**
 * Subscribe to all documents for a single contract, newest first.
 */
export function subscribeDocumentsForContract(contractId, cb) {
  if (!contractId) return () => {};
  const q = query(
    collection(db, COLLECTIONS.DOCUMENTS),
    where("contractId", "==", contractId),
    orderBy("uploadedAt", "desc"),
  );
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    () => cb([]),
  );
}
