import { useState, useEffect } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { getAllContracts } from "../../services/contractService";
import {
  uploadDocument,
  getAllDocuments,
  formatBytes,
  DOC_TYPES,
} from "../../services/documentService";
import { logAudit } from "../../services/auditService";
import { useAuth } from "../../context/AuthContext";
import Layout from "../../components/Layout";

const CURRENT_MONTH = new Date().toISOString().slice(0, 7);

export default function AdminDocumentManagement() {
  const { user } = useAuth();
  const [contracts, setContracts] = useState([]);
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState({
    contractId: "",
    docType: "Payslip",
    month: CURRENT_MONTH,
  });
  const [file, setFile] = useState(null);

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [c, d] = await Promise.all([getAllContracts(), getAllDocuments()]);
      setContracts(c);
      setDocs(d);
    } catch (e) {
      setError("Failed to load: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  function handleFileChange(e) {
    const f = e.target.files?.[0];
    if (f && f.type !== "application/pdf") {
      setError("Only PDF files are allowed.");
      return;
    }
    if (f && f.size > 10 * 1024 * 1024) {
      setError("File exceeds 10MB limit.");
      return;
    }
    setError("");
    setFile(f || null);
  }

  async function handleUpload(e) {
    e.preventDefault();
    if (!file || !form.contractId) {
      setError("Select a contract and PDF file.");
      return;
    }
    setError("");
    setUploading(true);
    setProgress(0);
    try {
      const contract = contracts.find((c) => c.id === form.contractId);
      const result = await uploadDocument({
        file,
        contractId: form.contractId,
        employerId: contract?.employerId,
        employeeId: contract?.employeeId,
        docType: form.docType,
        month: form.month,
        onProgress: setProgress,
      });

      // Send notification email
      try {
        await fetch("/api/admin/notify-document", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-admin-secret": "hris-internal-2026",
          },
          body: JSON.stringify({
            to: user.email,
            employeeFullName: contract?.employeeName || "Employee",
            fileName: file.name,
            uploadedAt: new Date().toLocaleString(),
          }),
        });
      } catch (_) {}

      await logAudit({
        action: "upload_document",
        userId: user.uid,
        userEmail: user.email,
        targetId: result.id,
        targetType: "document",
        details: { docType: form.docType, month: form.month },
      });
      setSuccess(
        `"${file.name}" uploaded as ${form.docType} for ${contract?.employeeName}.`,
      );
      setFile(null);
      loadAll();
    } catch (e) {
      setError("Upload failed: " + e.message);
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }

  return (
    <Layout>
      <div className="p-6 max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#1B4F72]">
            Document Management
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Upload contracts, payslips, and statutory records
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">
            Upload Document
          </h2>
          <form onSubmit={handleUpload} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contract *
                </label>
                <select
                  value={form.contractId}
                  onChange={(e) =>
                    setForm({ ...form, contractId: e.target.value })
                  }
                  required
                  className="input-field"
                >
                  <option value="">Select contract...</option>
                  {contracts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.employeeName} — {c.contractRef || c.id.slice(0, 6)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Document Type *
                </label>
                <select
                  value={form.docType}
                  onChange={(e) =>
                    setForm({ ...form, docType: e.target.value })
                  }
                  className="input-field"
                >
                  {DOC_TYPES.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Month
                </label>
                <input
                  type="month"
                  value={form.month}
                  onChange={(e) => setForm({ ...form, month: e.target.value })}
                  className="input-field"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                PDF File * (max 10MB)
              </label>
              <input
                type="file"
                accept="application/pdf,.pdf"
                onChange={handleFileChange}
                className="w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-[#1B4F72] file:text-white hover:file:bg-[#154360] cursor-pointer"
              />
              {file && (
                <p className="text-xs text-gray-500 mt-1">
                  {file.name} ({formatBytes(file.size)})
                </p>
              )}
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
              disabled={uploading || !file || !form.contractId}
              className="flex items-center gap-2 bg-[#1B4F72] hover:bg-[#154360] text-white px-5 py-2.5 rounded-lg text-sm font-medium disabled:opacity-50"
            >
              {uploading ? "Uploading..." : "Upload Document"}
            </button>
          </form>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-900">
              All Documents ({docs.length})
            </h2>
          </div>
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-4 border-[#1B4F72] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : docs.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">
              No documents uploaded yet
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">
                    File
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">
                    Type
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">
                    Month
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">
                    Size
                  </th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">
                    Download
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {docs.map((d) => (
                  <tr key={d.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">
                      {d.fileName}
                    </td>
                    <td className="px-4 py-3">
                      <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs font-medium">
                        {d.docType}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {d.month || "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-400">
                      {formatBytes(d.fileSize)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <a
                        href={d.downloadURL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#1B4F72] hover:bg-[#1B4F72]/10 px-3 py-1 rounded text-xs font-medium"
                      >
                        Download
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </Layout>
  );
}
export function DocumentManagementLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-[#1B4F72] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
