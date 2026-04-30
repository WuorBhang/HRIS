import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import Layout from "../../components/Layout";
import DocumentList from "../../components/DocumentList";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../lib/firebase";
import { COLLECTIONS } from "../../lib/constants";

export default function EmployeeDocuments() {
  const { user } = useAuth();
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    // Match either ownerId (legacy) or employeeId (contract-scoped) docs.
    const unsubOwner = onSnapshot(
      query(
        collection(db, COLLECTIONS.DOCUMENTS),
        where("ownerId", "==", user.uid),
        orderBy("uploadedAt", "desc"),
      ),
      (snap) => {
        setDocs((prev) => mergeById(prev, snap.docs));
        setLoading(false);
      },
      () => setLoading(false),
    );
    return () => {
      unsubOwner();
    };
  }, [user]);

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-primary">
          My Documents
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Your contracts, payslips and other files shared with you by admin.
        </p>
      </div>

      {loading ? (
        <div className="bg-card rounded-lg shadow p-10 text-center text-sm text-muted-foreground">
          Loading…
        </div>
      ) : (
        <DocumentList
          documents={docs}
          emptyText="You don't have any documents yet. Once admin uploads your contract or payslip, it will show up here."
        />
      )}
    </Layout>
  );
}

function mergeById(_prev, docs) {
  return docs.map((d) => ({ id: d.id, ...d.data() }));
}
