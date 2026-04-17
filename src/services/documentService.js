import {
  collection, addDoc, getDocs, doc, deleteDoc,
  query, where, serverTimestamp, orderBy,
} from "firebase/firestore";
import {
  ref, uploadBytesResumable, getDownloadURL, deleteObject,
} from "firebase/storage";
import { db, storage } from "../lib/firebase";

export const DOC_TYPES = ["Contract", "Payslip", "Statutory Record", "Other"];

function sortDesc(docs, field = "uploadedAt") {
  return docs.sort((a, b) => {
    const av = a[field]?.seconds ?? 0;
    const bv = b[field]?.seconds ?? 0;
    return bv - av;
  });
}

// Compress an image file using Canvas API before upload
async function compressImage(file, maxDim = 1200, quality = 0.82) {
  if (!file.type.startsWith("image/")) return file;
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width <= maxDim && height <= maxDim) { resolve(file); return; }
      if (width > height) { height = Math.round((height * maxDim) / width); width = maxDim; }
      else { width = Math.round((width * maxDim) / height); height = maxDim; }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d").drawImage(img, 0, 0, width, height);
      canvas.toBlob((blob) => resolve(new File([blob], file.name, { type: "image/jpeg" })), "image/jpeg", quality);
    };
    img.src = url;
  });
}

export async function uploadDocument({ file, contractId, employerId, employeeId, docType, month = null, onProgress }) {
  const now = new Date();
  const yyyyMM = month || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const compressed = await compressImage(file);
  const safeName = compressed.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `Documents/${employerId}/${contractId}/${docType}/${yyyyMM}/${safeName}`;

  const storageRef = ref(storage, storagePath);
  const uploadTask = uploadBytesResumable(storageRef, compressed);

  await new Promise((resolve, reject) => {
    uploadTask.on("state_changed",
      (snap) => onProgress && onProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
      reject,
      resolve
    );
  });

  const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);

  const docRef = await addDoc(collection(db, "documents"), {
    contractId,
    employerId,
    employeeId,
    docType,
    month: yyyyMM,
    fileName: file.name,
    fileSize: compressed.size,
    storagePath,
    downloadURL,
    uploadedAt: serverTimestamp(),
  });

  return { id: docRef.id, storagePath, downloadURL };
}

export async function getDocumentsByContract(contractId) {
  const snap = await getDocs(query(
    collection(db, "documents"),
    where("contractId", "==", contractId)
  ));
  return sortDesc(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
}

export async function getDocumentsByEmployer(employerId) {
  const snap = await getDocs(query(
    collection(db, "documents"),
    where("employerId", "==", employerId)
  ));
  return sortDesc(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
}

// Employee can only see Contract and Payslip — filter client-side to avoid index requirement
export async function getDocumentsForEmployee(employeeId) {
  const snap = await getDocs(query(
    collection(db, "documents"),
    where("employeeId", "==", employeeId)
  ));
  const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const visible = all.filter((d) => ["Contract", "Payslip"].includes(d.docType));
  return sortDesc(visible);
}

export async function getAllDocuments() {
  const q = query(collection(db, "documents"), orderBy("uploadedAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export function formatBytes(bytes) {
  if (!bytes) return "—";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}
