// Initials-based avatar with deterministic color.
import { useEffect, useState } from "react";

const PALETTE = [
  "bg-rose-500",
  "bg-orange-500",
  "bg-amber-500",
  "bg-emerald-500",
  "bg-teal-500",
  "bg-sky-500",
  "bg-indigo-500",
  "bg-fuchsia-500",
];
const initials = (n) =>
  !n
    ? "?"
    : n
        .trim()
        .split(/\s+/)
        .map((p) => p[0])
        .slice(0, 2)
        .join("")
        .toUpperCase();
const color = (n) => {
  let h = 0;
  for (const c of n || "") h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return PALETTE[h % PALETTE.length];
};

export default function Avatar({
  fullName,
  photoURL,
  size = 40,
  className = "",
}) {
  const dim = { width: size, height: size, fontSize: Math.round(size / 2.6) };
  // Reset failed-state whenever the URL changes so a fresh upload re-tries.
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setFailed(false);
  }, [photoURL]);

  const showImage = photoURL && !failed;
  return showImage ? (
    <img
      src={photoURL}
      alt={fullName}
      style={dim}
      onError={() => setFailed(true)}
      className={`rounded-full object-cover border border-border ${className}`}
    />
  ) : (
    <div
      style={dim}
      className={`rounded-full text-white font-semibold flex items-center justify-center select-none ${color(fullName)} ${className}`}
    >
      {initials(fullName)}
    </div>
  );
}
