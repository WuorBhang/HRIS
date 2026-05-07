// Tiny utilities used across the UI.
export const cn = (...c) => c.filter(Boolean).join(" ");

// Random temp password (12 chars, mixed).
export const generateTempPassword = (n = 12) => {
  const sets = ["ABCDEFGHJKLMNPQRSTUVWXYZ", "abcdefghijkmnpqrstuvwxyz", "23456789", "!@#$%&*"];
  const all = sets.join("");
  const pick = (s) => s[Math.floor(Math.random() * s.length)];
  let p = sets.map(pick).join("");
  while (p.length < n) p += pick(all);
  return p.split("").sort(() => Math.random() - 0.5).join("");
};

// Format Firestore Timestamp / Date / ISO string as "DD MMM YYYY".
export const formatDate = (v) => {
  if (!v) return "—";
  const d = v.toDate ? v.toDate() : new Date(v);
  return isNaN(d) ? "—" : d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

// Format Firestore Timestamp as "DD MMM YYYY HH:mm".
export const formatTs = (ts) => {
  const ms = ts?.toMillis?.();
  if (!ms) return "—";
  return new Date(ms).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

// Map status code to label.
export const statusLabel = (s) =>
  ({ pending_approval: "Pending approval", approved: "Approved", active: "Active", disabled: "Disabled" }[s] || s);

// Sort by createdAt desc.
export const sortByCreated = (arr) =>
  [...arr].sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
