// Employer documents view (filter by type/employee).
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { subscribeDocumentsForEmployer } from "../../lib/documents";
import { Select, Card, PageHeader } from "../../lib/ui";
import Layout from "../../components/Layout";
import DocumentList from "../../components/DocumentList";

const TYPES = [
  { value: "all", label: "All" },
  { value: "contract", label: "Contracts" },
  { value: "payslip", label: "Payslips" },
];

export default function Documents() {
  const { user } = useAuth();
  const [docs, setDocs] = useState([]);
  const [type, setType] = useState("all");
  const [employee, setEmployee] = useState("all");

  useEffect(
    () => (user ? subscribeDocumentsForEmployer(user.uid, setDocs) : undefined),
    [user],
  );

  const employees = useMemo(() => {
    const map = {};
    for (const d of docs)
      if (d.employeeId) map[d.employeeId] = d.employeeName || "Unknown";
    return Object.entries(map).map(([id, name]) => ({
      value: id,
      label: name,
    }));
  }, [docs]);

  const filtered = useMemo(
    () =>
      docs.filter(
        (d) =>
          (type === "all" || d.type === type) &&
          (employee === "all" || d.employeeId === employee),
      ),
    [docs, type, employee],
  );

  return (
    <Layout>
      <PageHeader title="Documents" subtitle="Documents for your employees." />
      <Card className="mb-4">
        <div className="grid sm:grid-cols-2 gap-3">
          <Select
            label="Type"
            value={type}
            onChange={setType}
            options={TYPES}
          />
          <Select label="Employee" value={employee} onChange={setEmployee}>
            <option value="all">All</option>
            {employees.map((e) => (
              <option key={e.value} value={e.value}>
                {e.label}
              </option>
            ))}
          </Select>
        </div>
      </Card>
      <DocumentList documents={filtered} emptyText="No documents." />
    </Layout>
  );
}
