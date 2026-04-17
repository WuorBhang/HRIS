import { useState, useEffect, useRef } from "react";
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
  orderBy,
} from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { db, storage } from "../lib/firebase";
import { useAuth } from "../context/AuthContext";
import Layout from "../components/Layout";

const MAX_SIZE_MB = 10;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

function formatDate(ts) {
  if (!ts) return "—";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

export default function Documents() {
  const { user } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [file, setFile] = useState(null);
  const fileRef = useRef(null);

  useEffect(() => {
    loadData();
  }, [user]);

  async function loadData() {
    setLoading(true);
    try {
      const empQ = query(
        collection(db, "employees"),
        where("employerId", "==", user.uid),
      );
      const empSnap = await getDocs(empQ);
      const empList = empSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setEmployees(empList);

      const docQ = query(
        collection(db, "documents"),
        where("uploadedBy", "==", user.uid),
        orderBy("uploadedAt", "desc"),
      );
      const docSnap = await getDocs(docQ);
      setDocs(docSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (e) {
      setError("Failed to load: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  function handleFileChange(e) {
    setError("");
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.type !== "application/pdf") {
      setError("Only PDF files are allowed.");
      fileRef.current.value = "";
      return;
    }
    if (f.size > MAX_SIZE_BYTES) {
      setError(`File exceeds ${MAX_SIZE_MB}MB limit (${formatBytes(f.size)}).`);
      fileRef.current.value = "";
      return;
    }
    setFile(f);
  }

  async function handleUpload(e) {
    e.preventDefault();
    if (!selectedEmployee || !file) {
      setError("Please select an employee and a PDF file.");
      return;
    }
    setError("");
    setSuccess("");
    setUploading(true);
    setProgress(0);

    const now = new Date();
    const yyyyMM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storagePath = `Documents/${user.uid}/${selectedEmployee}/${yyyyMM}/${safeName}`;

    try {
      const storageRef = ref(storage, storagePath);
      const uploadTask = uploadBytesResumable(storageRef, file);

      await new Promise((resolve, reject) => {
        uploadTask.on(
          "state_changed",
          (snap) => {
            setProgress(
              Math.round((snap.bytesTransferred / snap.totalBytes) * 100),
            );
          },
          reject,
          resolve,
        );
      });

      const employee = employees.find((e) => e.id === selectedEmployee);

      await addDoc(collection(db, "documents"), {
        employeeId: selectedEmployee,
        employeeFullName: employee?.fullName || "Unknown",
        uploadedBy: user.uid,
        uploadedAt: serverTimestamp(),
        storagePath,
        fileName: file.name,
        fileSize: file.size,
      });

      // Trigger server-side notification email to uploader (SendGrid key stays server-side)
      let notifyResult = { success: false, emailError: "request failed" };
      try {
        const notifyRes = await fetch("/api/admin/notify-document", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-admin-secret": "hris-internal-2026",
          },
          body: JSON.stringify({
            to: user.email,
            employeeFullName: employee?.fullName || "Unknown",
            fileName: file.name,
            uploadedAt: new Date().toLocaleString(),
          }),
        });
        notifyResult = await notifyRes.json();
      } catch (_) {
        // Email failure must not block the upload success UI
      }

      const emailNote = notifyResult.success
        ? `A notification email was sent to ${user.email}.`
        : `Document saved. Email notification failed — check SendGrid sender verification.`;

      setSuccess(
        `"${file.name}" uploaded successfully for ${employee?.fullName}. ${emailNote}`,
      );
      setFile(null);
      setSelectedEmployee("");
      if (fileRef.current) fileRef.current.value = "";
      loadData();
    } catch (e) {
      setError("Upload failed: " + e.message);
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }

  async function handleDownload(doc) {
    try {
      const storageRef = ref(storage, doc.storagePath);
      const url = await getDownloadURL(storageRef);
      window.open(url, "_blank");
    } catch (e) {
      setError("Download failed: " + e.message);
    }
  }

  const empMap = Object.fromEntries(employees.map((e) => [e.id, e]));

  return (
    <Layout>
      <div className="p-6 max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#1B4F72]">Documents</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Upload and manage employee PDF documents
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">
            Upload New Document
          </h2>
          <form onSubmit={handleUpload} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Employee *
                </label>
                <select
                  value={selectedEmployee}
                  onChange={(e) => setSelectedEmployee(e.target.value)}
                  required
                  className="input-field"
                >
                  <option value="">Select employee...</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.fullName} — {emp.jobTitle}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  PDF File * (max {MAX_SIZE_MB}MB)
                </label>
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={handleFileChange}
                  ref={fileRef}
                  required
                  className="w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-[#1B4F72] file:text-white hover:file:bg-[#154360] cursor-pointer"
                />
                {file && (
                  <p className="text-xs text-gray-500 mt-1">
                    {file.name} ({formatBytes(file.size)})
                  </p>
                )}
              </div>
            </div>

            {uploading && (
              <div>
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Uploading...</span>
                  <span>{progress}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className="bg-[#1B4F72] h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
                {error}
              </div>
            )}
            {success && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-green-700 text-sm">
                ✓ {success}
              </div>
            )}

            <button
              type="submit"
              disabled={uploading || !file || !selectedEmployee}
              className="flex items-center gap-2 bg-[#1B4F72] hover:bg-[#154360] text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                />
              </svg>
              {uploading ? "Uploading..." : "Upload Document"}
            </button>
          </form>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-900">
              Uploaded Documents
            </h2>
          </div>
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-4 border-[#1B4F72] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : docs.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-3">📁</div>
              <p className="text-gray-500 text-sm">
                No documents uploaded yet.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">
                      File Name
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">
                      Employee
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">
                      Size
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">
                      Uploaded
                    </th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-600">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {docs.map((doc) => (
                    <tr
                      key={doc.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-red-500 text-lg">📄</span>
                          <span className="font-medium text-gray-900 truncate max-w-[200px]">
                            {doc.fileName}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {doc.employeeFullName ||
                          empMap[doc.employeeId]?.fullName ||
                          "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {doc.fileSize ? formatBytes(doc.fileSize) : "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {formatDate(doc.uploadedAt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleDownload(doc)}
                          className="text-[#1B4F72] hover:bg-[#1B4F72]/10 px-3 py-1 rounded text-xs font-medium transition-colors"
                        >
                          Download
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="mt-6 bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-700">
          <strong>Security note:</strong> Downloads use authenticated Firebase
          Storage URLs, not public links. Only the uploading employer can access
          their files. An email notification is sent automatically when a
          document is uploaded.
        </div>
      </div>
    </Layout>
  );
}
