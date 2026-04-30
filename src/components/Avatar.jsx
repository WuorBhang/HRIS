function getInitials(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Deterministic background color from the name so the same person always
// gets the same avatar tint when we have to fall back to initials.
function colorFromName(name) {
  const palette = [
    "bg-rose-500",
    "bg-orange-500",
    "bg-amber-500",
    "bg-emerald-500",
    "bg-teal-500",
    "bg-sky-500",
    "bg-indigo-500",
    "bg-fuchsia-500",
  ];
  if (!name) return palette[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++)
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return palette[hash % palette.length];
}

export default function Avatar({
  fullName,
  photoURL,
  size = 40,
  className = "",
}) {
  const dimension = {
    width: size,
    height: size,
    fontSize: Math.round(size / 2.6),
  };

  if (photoURL) {
    return (
      <img
        src={photoURL}
        alt={fullName || "User"}
        style={dimension}
        className={`rounded-full object-cover border border-border ${className}`}
      />
    );
  }

  return (
    <div
      style={dimension}
      className={`rounded-full text-white font-semibold flex items-center justify-center select-none ${colorFromName(fullName)} ${className}`}
    >
      {getInitials(fullName)}
    </div>
  );
}
