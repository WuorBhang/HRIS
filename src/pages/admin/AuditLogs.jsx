import { useState, useEffect } from "react";
import { getAuditLogs } from "../../services/auditService";
import Layout from "../../components/Layout";

function timeAgo(ts) {
  if (!ts) return "—";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const ACTION_ICONS = {
  create_contract: "📋",
  update_contract: "✏️",
  create_account: "👤",
  upload_document: "📄",
  approve_leave: "✅",
  reject_leave: "❌",
  approve_timesheet: "📊",
  unlock_month: "🔓",
};

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    getAuditLogs({ limitCount: 200 })
      .then(setLogs)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter
    ? logs.filter(
        (l) => l.action?.includes(filter) || l.userEmail?.includes(filter),
      )
    : logs;

  return (
    <Layout>
      <div className="p-6 max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#1B4F72]">Audit Logs</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            All system actions with timestamps
          </p>
        </div>

        <div className="mb-4">
          <input
            type="text"
            placeholder="Filter by action or email..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="input-field max-w-sm"
          />
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-4 border-[#1B4F72] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">
              No audit logs found
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">
                    Action
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">
                    User
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">
                    Target
                  </th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">
                    Time
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className="mr-2">
                        {ACTION_ICONS[log.action] || "📌"}
                      </span>
                      <span className="font-medium text-gray-800">
                        {log.action?.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {log.userEmail || log.userId}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs font-mono">
                      {log.targetId || "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-400 text-xs">
                      {timeAgo(log.createdAt)}
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

export function AuditLogsLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-[#1B4F72] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export function AuditLogsError() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-red-500 text-sm">Failed to load audit logs.</p>
    </div>
  );
}
