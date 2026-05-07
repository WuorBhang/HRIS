// Employee documents (own).
import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../lib/firebase";
import { COLLECTIONS } from "../../lib/constants";
import { PageHeader } from "../../lib/ui";
import Layout from "../../components/Layout";
import DocumentList from "../../components/DocumentList";

export default function Documents() {
  const { user } = useAuth();
  const [docs, setDocs] = useState([]);

  useEffect(() => {
    if (!user) return;
    return onSnapshot(
      query(
        collection(db, COLLECTIONS.DOCUMENTS),
        where("ownerId", "==", user.uid),
      ),
      (s) =>
        setDocs(
          s.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .sort(
              (a, b) =>
                (b.uploadedAt?.toMillis?.() || 0) -
                (a.uploadedAt?.toMillis?.() || 0),
            ),
        ),
      () => setDocs([]),
    );
  }, [user]);

  return (
    <Layout>
      <PageHeader
        title="My documents"
        subtitle="Your contracts, payslips, and files."
      />
      <DocumentList
        documents={docs}
        emptyText="No documents shared with you yet."
      />
    </Layout>
  );
}
