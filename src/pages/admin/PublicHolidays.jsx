import { useState, useEffect } from "react";
import {
  addPublicHoliday,
  getPublicHolidays,
  updatePublicHoliday,
  deletePublicHoliday,
} from "../../services/publicHolidayService";
import { logAudit } from "../../services/auditService";
import { useAuth } from "../../context/AuthContext";
import Layout from "../../components/Layout";

const CURRENT_YEAR = new Date().getFullYear();
const KE_DEFAULTS = [
  { date: `${CURRENT_YEAR}-01-01`, name: "New Year's Day" },
  { date: `${CURRENT_YEAR}-04-18`, name: "Good Friday" },
  { date: `${CURRENT_YEAR}-04-21`, name: "Easter Monday" },
  { date: `${CURRENT_YEAR}-05-01`, name: "Labour Day" },
  { date: `${CURRENT_YEAR}-06-01`, name: "Madaraka Day" },
  { date: `${CURRENT_YEAR}-10-10`, name: "Huduma Day" },
  { date: `${CURRENT_YEAR}-10-20`, name: "Mashujaa Day" },
  { date: `${CURRENT_YEAR}-12-12`, name: "Jamhuri Day" },
  { date: `${CURRENT_YEAR}-12-25`, name: "Christmas Day" },
  { date: `${CURRENT_YEAR}-12-26`, name: "Boxing Day" },
];

export default function PublicHolidays() {
  const { user } = useAuth();
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ date: "", name: "", country: "KE" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [year, setYear] = useState(CURRENT_YEAR);
  const [deleting, setDeleting] = useState("");

  useEffect(() => {
    load();
  }, [year]);

  async function load() {
    setLoading(true);
    try {
      setHolidays(await getPublicHolidays(year));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await addPublicHoliday({
        ...form,
        year: parseInt(form.date.split("-")[0]),
      });
      await logAudit({
        action: "add_public_holiday",
        userId: user.uid,
        userEmail: user.email,
        targetType: "publicHoliday",
        details: { name: form.name, date: form.date },
      });
      setForm({ date: "", name: "", country: "KE" });
      setShowForm(false);
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id, name) {
    if (!confirm(`Delete "${name}"?`)) return;
    setDeleting(id);
    try {
      await deletePublicHoliday(id);
      await logAudit({
        action: "delete_public_holiday",
        userId: user.uid,
        userEmail: user.email,
        targetId: id,
        targetType: "publicHoliday",
      });
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setDeleting("");
    }
  }

  async function seedDefaults() {
    if (
      !confirm(`Seed ${KE_DEFAULTS.length} Kenya public holidays for ${year}?`)
    )
      return;
    setSaving(true);
    try {
      for (const h of KE_DEFAULTS) {
        await addPublicHoliday({ ...h, year, country: "KE" });
      }
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Layout>
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#1B4F72]">
              Public Holidays
            </h1>
            <p className="text-gray-500 text-sm mt-0.5">
              Kenya (KE) holidays used to distinguish overtime from holiday work
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={seedDefaults}
              disabled={saving}
              className="px-4 py-2 border border-[#1B4F72] text-[#1B4F72] rounded-lg text-sm font-medium hover:bg-[#1B4F72]/5 disabled:opacity-50"
            >
              Seed KE {year}
            </button>
            <button
              onClick={() => setShowForm(true)}
              className="bg-[#F39C12] hover:bg-[#d68910] text-white px-4 py-2 rounded-lg text-sm font-medium"
            >
              + Add Holiday
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm mb-4">
            {error}
          </div>
        )}

        <div className="flex gap-2 mb-4">
          {[CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1].map((y) => (
            <button
              key={y}
              onClick={() => setYear(y)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${year === y ? "bg-[#1B4F72] text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"}`}
            >
              {y}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-[#1B4F72] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : holidays.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
            <div className="text-4xl mb-3">🗓️</div>
            <h3 className="font-semibold text-gray-700 mb-1">
              No holidays for {year}
            </h3>
            <p className="text-gray-400 text-sm mb-4">
              Use "Seed KE {year}" to add Kenya's official public holidays.
            </p>
            <button
              onClick={seedDefaults}
              className="bg-[#1B4F72] text-white px-4 py-2 rounded-lg text-sm font-medium"
            >
              Seed Kenya Holidays
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">
                    Date
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">
                    Holiday Name
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">
                    Country
                  </th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {holidays.map((h) => (
                  <tr key={h.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-gray-700">
                      {h.date}
                    </td>
                    <td className="px-4 py-3 text-gray-900 font-medium">
                      {h.name}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                        {h.country || "KE"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDelete(h.id, h.name)}
                        disabled={deleting === h.id}
                        className="text-red-500 hover:text-red-700 px-3 py-1 rounded text-xs font-medium disabled:opacity-50"
                      >
                        {deleting === h.id ? "..." : "Delete"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-700">
          <strong>How this is used:</strong> When an employee submits time
          worked on a listed holiday date, it is automatically treated as
          "Working on Holiday" and the holiday multiplier from their contract is
          applied — separate from regular overtime.
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="p-5 border-b border-gray-100">
              <h2 className="font-bold text-[#1B4F72]">Add Public Holiday</h2>
            </div>
            <form onSubmit={handleAdd} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date *
                </label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  required
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Holiday Name *
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  className="input-field"
                  placeholder="e.g. Labour Day"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Country
                </label>
                <input
                  type="text"
                  value={form.country}
                  onChange={(e) =>
                    setForm({ ...form, country: e.target.value })
                  }
                  className="input-field"
                  placeholder="KE"
                  maxLength={2}
                />
              </div>
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
                  {error}
                </div>
              )}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg hover:bg-gray-50 text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-[#F39C12] text-white py-2.5 rounded-lg hover:bg-[#d68910] text-sm font-medium disabled:opacity-60"
                >
                  {saving ? "Adding..." : "Add Holiday"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
export function PublicHolidaysLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-[#1B4F72] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
export function AdminDashboard() {
  const { user } = useAuth();
  const [recentLogs, setRecentLogs] = useState([]);
}
