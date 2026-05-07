// Admin documents: upload + list + delete (Supabase storage).
import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { Upload, Trash2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../lib/firebase";
import {
  COLLECTIONS,
  DOCUMENT_TYPES,
  DOCUMENT_TYPE_LABELS,
  MONTHLY_TYPES,
} from "../../lib/constants";
import {
  uploadContractDocument,
  deleteContractDocument,
  humanFileSize,
} from "../../lib/documents";
import { formatDate } from "../../lib/utils";
import { AUDIT, logAction } from "../../lib/audit";
import {
  Input,
  Select,
  Button,
  Alert,
  Card,
  PageHeader,
  Modal,
} from "../../lib/ui";
import Layout from "../../components/Layout";

export default function Documents() {
  const { user, profile } = useAuth();
  const [contracts, setContracts] = useState([]);
  const [docs, setDocs] = useState([]);
  const [filter, setFilter] = useState("all");
  const [modal, setModal] = useState(false);

  // Auto-derived "today" values used to prefill the upload form.
  const today = new Date();
  const todayISO = today.toISOString().slice(0, 10); // YYYY-MM-DD
  const todayMonth = todayISO.slice(0, 7); // YYYY-MM
  const todayLabel = today.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const [f, setF] = useState({
    contractId: "",
    type: DOCUMENT_TYPES.PAYSLIP,
    month: todayMonth,
    title: "",
    file: null,
  });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(
    () =>
      onSnapshot(
        collection(db, COLLECTIONS.CONTRACTS),
        (s) => setContracts(s.docs.map((d) => ({ id: d.id, ...d.data() }))),
        () => {},
      ),
    [],
  );
  useEffect(
    () =>
      onSnapshot(
        query(
          collection(db, COLLECTIONS.DOCUMENTS),
          orderBy("uploadedAt", "desc"),
        ),
        (s) => setDocs(s.docs.map((d) => ({ id: d.id, ...d.data() }))),
        () => {},
      ),
    [],
  );

  const filtered = useMemo(
    () =>
      filter === "all" ? docs : docs.filter((d) => d.contractId === filter),
    [docs, filter],
  );

  // Upload submit.
  const onUpload = async (e) => {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      const contract = contracts.find((c) => c.id === f.contractId);
      const { id } = await uploadContractDocument({
        contract,
        file: f.file,
        type: f.type,
        month: f.month,
        title: f.title,
        uploadedBy: user.uid,
      });
      logAction(AUDIT.DOCUMENT_UPLOADED, user.uid, profile?.role, {
        documentId: id,
        type: f.type,
        contractId: f.contractId,
      });
      setF({
        contractId: "",
        type: DOCUMENT_TYPES.PAYSLIP,
        month: todayMonth,
        title: "",
        file: null,
      });
      setModal(false);
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setBusy(false);
    }
  };

  // Delete doc.
  const onDelete = async (d) => {
    if (!confirm(`Delete "${d.title}"?`)) return;
    await deleteContractDocument(d);
    logAction(AUDIT.DOCUMENT_DELETED, user.uid, profile?.role, {
      documentId: d.id,
    });
  };

  return (
    <Layout>
      <PageHeader
        title="Documents"
        subtitle="Upload and manage employee documents."
        right={
          <Button onClick={() => setModal(true)}>
            <Upload className="w-4 h-4 inline mr-1" /> Upload
          </Button>
        }
      />
      <Card>
        <div className="mb-4 max-w-xs">
          <Select
            label="Filter by contract"
            value={filter}
            onChange={setFilter}
          >
            <option value="all">All contracts</option>
            {contracts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.employeeName} ↔ {c.employerName}
              </option>
            ))}
          </Select>
        </div>
        {!filtered.length ? (
          <div className="text-center text-sm text-muted-foreground py-10">
            No documents.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((d) => (
              <li key={d.id} className="py-3 flex flex-wrap items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{d.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {DOCUMENT_TYPE_LABELS[d.type] || d.type}
                    {d.contractNo ? ` · ${d.contractNo}` : ""} ·{" "}
                    {d.employeeName} · {humanFileSize(d.size)} ·{" "}
                    {formatDate(d.uploadedAt)}
                  </div>
                </div>
                <a
                  href={d.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary text-sm hover:underline"
                >
                  View
                </a>
                <button
                  onClick={() => onDelete(d)}
                  className="text-destructive p-1 hover:bg-destructive/10 rounded"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title="Upload document"
      >
        <Alert tone="error">{err}</Alert>
        <form onSubmit={onUpload} className="space-y-4">
          <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
            Upload date is auto-detected:{" "}
            <span className="font-semibold text-primary">{todayLabel}</span>
          </div>
          <Select
            label="Contract"
            value={f.contractId}
            onChange={(v) => setF((p) => ({ ...p, contractId: v }))}
            required
          >
            <option value="">Pick contract…</option>
            {contracts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.contractNo ? `${c.contractNo} · ` : ""}
                {c.employeeName} ↔ {c.employerName}
              </option>
            ))}
          </Select>
          <Select
            label="Type"
            value={f.type}
            onChange={(v) => setF((p) => ({ ...p, type: v }))}
          >
            {Object.values(DOCUMENT_TYPES).map((t) => (
              <option key={t} value={t}>
                {DOCUMENT_TYPE_LABELS[t]}
              </option>
            ))}
          </Select>
          {MONTHLY_TYPES.includes(f.type) && (
            <Input
              label="Month (YYYY-MM)"
              value={f.month}
              onChange={(v) => setF((p) => ({ ...p, month: v }))}
              placeholder="2025-03"
              required
            />
          )}
          <Input
            label="Title (optional)"
            value={f.title}
            onChange={(v) => setF((p) => ({ ...p, title: v }))}
          />
          <div>
            <label className="block text-sm font-medium mb-1">File</label>
            <input
              type="file"
              onChange={(e) =>
                setF((p) => ({ ...p, file: e.target.files?.[0] || null }))
              }
              required
              className="w-full text-sm"
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={busy}>
              {busy ? "Uploading…" : "Upload"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setModal(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Modal>
    </Layout>
  );
}
