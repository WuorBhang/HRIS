import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import Layout from "../../components/Layout";
import DocumentList from "../../components/DocumentList";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../lib/firebase";
import {
  COLLECTIONS,
  DOCUMENT_TYPES,
  DOCUMENT_TYPE_LABELS,
} from "../../lib/constants";
import { subscribeDocumentsForEmployer } from "../../lib/documents";

const FILTERS = [
  { key: "all", label: "All" },
  {
    key: DOCUMENT_TYPES.CONTRACT,
    label: DOCUMENT_TYPE_LABELS[DOCUMENT_TYPES.CONTRACT],
  },
  {
    key: DOCUMENT_TYPES.PAYSLIP,
    label: DOCUMENT_TYPE_LABELS[DOCUMENT_TYPES.PAYSLIP],
  },
  {
    key: DOCUMENT_TYPES.STATUTORY,
    label: DOCUMENT_TYPE_LABELS[DOCUMENT_TYPES.STATUTORY],
  },
];

export default function EmployerDocuments() {
  const { user } = useAuth();
  const [docs, setDocs] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [filter, setFilter] = useState("all");
  const [contractFilter, setContractFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const unsubD = subscribeDocumentsForEmployer(user.uid, (list) => {
      setDocs(list);
      setLoading(false);
    });
    const unsubC = onSnapshot(
      query(
        collection(db, COLLECTIONS.CONTRACTS),
        where("employerId", "==", user.uid),
      ),
      (s) => setContracts(s.docs.map((d) => ({ id: d.id, ...d.data() }))),
    );
    return () => {
      unsubD();
      unsubC();
    };
  }, [user]);

  const filtered = useMemo(() => {
    return docs
      .filter((d) => (filter === "all" ? true : d.type === filter))
      .filter((d) =>
        contractFilter === "all" ? true : d.contractId === contractFilter,
      );
  }, [docs, filter, contractFilter]);

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-primary">
          Documents
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Files uploaded by SafiHub admin: signed contracts, payslips and
          statutory records.
        </p>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`text-xs px-3 py-1.5 rounded-full border transition ${
              filter === f.key
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-muted-foreground border-border hover:text-foreground"
            }`}
          >
            {f.label}
          </button>
        ))}
        {contracts.length > 1 && (
          <select
            value={contractFilter}
            onChange={(e) => setContractFilter(e.target.value)}
            className="text-xs ml-auto border border-border rounded-md px-2 py-1.5 bg-card outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">All employees</option>
            {contracts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.employeeName || c.employeeEmail || "Employee"}
              </option>
            ))}
          </select>
        )}
      </div>

      {loading ? (
        <div className="bg-card rounded-lg shadow p-10 text-center text-sm text-muted-foreground">
          Loading…
        </div>
      ) : (
        <DocumentList documents={filtered} />
      )}
    </Layout>
  );
}
