import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { Upload, Trash2, FileText, Download } from "lucide-react";
import Layout from "../../components/Layout";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../lib/firebase";
import {
  COLLECTIONS,
  DOCUMENT_TYPES,
  DOCUMENT_TYPE_LABELS,
} from "../../lib/constants";
import { formatDate } from "../../lib/utils";
import {
  deleteContractDocument,
  uploadContractDocument,
} from "../../lib/documents";
import { AUDIT_ACTIONS, logAction } from "../../lib/audit";

export default function AdminDocuments() {
  const { user, profile } = useAuth();
  const [contracts, setContracts] = useState([]);
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [filterContract, setFilterContract] = useState("all");

  useEffect(() => {
    const unsubC = onSnapshot(
      query(
        collection(db, COLLECTIONS.CONTRACTS),
        orderBy("createdAt", "desc"),
      ),
      (s) => setContracts(s.docs.map((d) => ({ id: d.id, ...d.data() }))),
    );
    const unsubD = onSnapshot(
      query(
        collection(db, COLLECTIONS.DOCUMENTS),
        orderBy("uploadedAt", "desc"),
      ),
      (s) => {
        setDocs(s.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      () => setLoading(false),
    );
    return () => {
      unsubC();
      unsubD();
    };
  }, []);

  const filtered = useMemo(
    () =>
      filterContract === "all"
        ? docs
        : docs.filter((d) => d.contractId === filterContract),
    [docs, filterContract],
  );

  const remove = async (d) => {
    if (!confirm(`Delete "${d.title}"?`)) return;
    try {
      await deleteContractDocument(d);
      logAction(AUDIT_ACTIONS.DOCUMENT_DELETED, user.uid, profile?.role, {
        documentId: d.id,
        contractId: d.contractId,
        type: d.type,
      });
    } catch (err) {
      alert(err.message || "Could not delete.");
    }
  };

  return (
    <Layout>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-primary">
            Documents
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Upload signed contracts, payslips and statutory records and link
            them to an employer ↔ employee contract.
          </p>
        </div>
        <button
          onClick={() => setShowUpload(true)}
          disabled={contracts.length === 0}
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium hover:opacity-90 disabled:opacity-50 w-full sm:w-auto justify-center"
        >
          <Upload className="w-4 h-4" />
          Upload document
        </button>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">
          Filter by contract:
        </span>
        <select
          value={filterContract}
          onChange={(e) => setFilterContract(e.target.value)}
          className="text-sm border border-border rounded-md px-2 py-1 bg-card outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="all">All contracts</option>
          {contracts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.employerName || "—"} ↔ {c.employeeName || "—"}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="bg-card rounded-lg shadow p-12 text-center text-sm text-muted-foreground">
          Loading…
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-card rounded-lg shadow p-12 text-center text-sm text-muted-foreground">
          No documents yet.
        </div>
      ) : (
        <div className="bg-card rounded-lg shadow overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="p-3">Title</th>
                <th className="p-3">Type</th>
                <th className="p-3">Month</th>
                <th className="p-3">Linked to</th>
                <th className="p-3">Uploaded</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((d) => {
                const c = contracts.find((x) => x.id === d.contractId);
                return (
                  <tr key={d.id} className="border-t border-border">
                    <td className="p-3 font-medium flex items-center gap-2">
                      <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                      {d.title}
                    </td>
                    <td className="p-3">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                        {DOCUMENT_TYPE_LABELS[d.type] || d.type}
                      </span>
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {d.month || "—"}
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {c
                        ? `${c.employerName || "—"} ↔ ${c.employeeName || "—"}`
                        : "—"}
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {formatDate(d.uploadedAt)}
                    </td>
                    <td className="p-3 text-right whitespace-nowrap">
                      <a
                        href={d.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-primary text-sm mr-3 hover:underline"
                      >
                        <Download className="w-4 h-4" />
                        View
                      </a>
                      <button
                        onClick={() => remove(d)}
                        className="text-sm text-destructive hover:underline inline-flex items-center gap-1"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showUpload && (
        <UploadModal
          contracts={contracts}
          onClose={() => setShowUpload(false)}
          uploader={user}
          uploaderRole={profile?.role}
        />
      )}
    </Layout>
  );
}

function UploadModal({ contracts, onClose, uploader, uploaderRole }) {
  const [contractId, setContractId] = useState(contracts[0]?.id || "");
  const [type, setType] = useState(DOCUMENT_TYPES.PAYSLIP);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [title, setTitle] = useState("");
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!contractId) return setError("Pick a contract.");
    if (!file) return setError("Pick a file.");
    if (!month) return setError("Month is required (YYYY-MM).");
    setLoading(true);
    try {
      const contract = contracts.find((c) => c.id === contractId);
      const res = await uploadContractDocument({
        contract,
        file,
        type,
        month,
        title,
        uploadedBy: uploader?.uid,
      });
      logAction(AUDIT_ACTIONS.DOCUMENT_UPLOADED, uploader?.uid, uploaderRole, {
        documentId: res.id,
        contractId,
        type,
        month,
      });
      onClose();
    } catch (err) {
      setError(err.message || "Upload failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-start sm:items-center justify-center px-4 py-6 z-50 overflow-y-auto">
      <div className="bg-card rounded-lg shadow-xl w-full max-w-md p-5 sm:p-6 my-auto">
        <h2 className="text-lg font-semibold text-primary mb-4">
          Upload document
        </h2>
        {error && (
          <div className="mb-3 p-3 rounded-md border border-destructive/40 bg-destructive/10 text-destructive text-sm">
            {error}
          </div>
        )}
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Contract</label>
            <select
              value={contractId}
              onChange={(e) => setContractId(e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-border bg-card outline-none focus:ring-2 focus:ring-primary"
              required
            >
              {contracts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.employerName || "—"} ↔ {c.employeeName || "—"}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-border bg-card outline-none focus:ring-2 focus:ring-primary"
            >
              {Object.entries(DOCUMENT_TYPE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          {type !== DOCUMENT_TYPES.CONTRACT && (
            <div>
              <label className="block text-sm font-medium mb-1">Month</label>
              <input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-border bg-card outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>
          )}
          {type === DOCUMENT_TYPES.CONTRACT && (
            <div>
              <label className="block text-sm font-medium mb-1">
                Effective month
              </label>
              <input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-border bg-card outline-none focus:ring-2 focus:ring-primary"
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                Required for every document. Use the contract start month.
              </p>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Optional — defaults to filename"
              className="w-full px-3 py-2 rounded-md border border-border bg-card outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">File</label>
            <input
              type="file"
              accept="application/pdf,image/*"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              required
              className="w-full text-sm"
            />
            <p className="text-xs text-muted-foreground mt-1">
              PDF or image, max 20 MB.
            </p>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-md border border-border hover:bg-muted/30"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-md bg-primary text-primary-foreground font-medium hover:opacity-90 disabled:opacity-50"
            >
              {loading ? "Uploading…" : "Upload"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
