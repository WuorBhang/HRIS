// Full-page spinner.
export default function Spinner({ size = 8, className = "" }) {
  return (
    <div
      className={`border-4 border-primary border-t-transparent rounded-full animate-spin ${className}`}
      style={{ width: `${size * 4}px`, height: `${size * 4}px` }}
    />
  );
}
