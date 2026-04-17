import { useState, useEffect } from "react";
import {
  getDocumentsForEmployee,
  formatBytes,
} from "../../services/documentService";
import { useAuth } from "../../context/AuthContext";
import Layout from "../../components/Layout";

function formatDate(ts) {
  if (!ts) return "—";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function MyDocuments() {
  const { user } = useAuth();
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getDocumentsForEmployee(user.uid)
      .then(setDocs)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [user]);

  return (
    <Layout>
      <div className="p-6 max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#1B4F72]">My Documents</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            View your contracts and payslips
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm mb-4">
            {error}
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-4 border-[#1B4F72] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : docs.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-3">📁</div>
              <p className="text-gray-500 text-sm">
                No documents available yet.
              </p>
              <p className="text-gray-400 text-xs mt-1">
                Your employer will upload contracts and payslips here.
              </p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">
                    File Name
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
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-red-500">📄</span>
                        <span className="font-medium text-gray-800">
                          {d.fileName}
                        </span>
                      </div>
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
