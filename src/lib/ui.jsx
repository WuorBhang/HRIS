// Shared tiny UI building blocks used across pages/components.
import { Search, X } from "lucide-react";

const baseInput =
  "w-full px-3 py-2 rounded-md border border-border bg-card outline-none focus:ring-2 focus:ring-primary";

// Form input wrapper.
export const Input = ({ label, value, onChange, type = "text", ...rest }) => (
  <div>
    {label && <label className="block text-sm font-medium mb-1">{label}</label>}
    <input
      type={type}
      value={value ?? ""}
      onChange={(e) => onChange?.(e.target.value)}
      className={baseInput}
      {...rest}
    />
  </div>
);

// Form textarea wrapper.
export const Textarea = ({ label, value, onChange, rows = 3, ...rest }) => (
  <div>
    {label && <label className="block text-sm font-medium mb-1">{label}</label>}
    <textarea
      value={value ?? ""}
      onChange={(e) => onChange?.(e.target.value)}
      rows={rows}
      className={baseInput}
      {...rest}
    />
  </div>
);

// Form select wrapper.
export const Select = ({
  label,
  value,
  onChange,
  options,
  children,
  ...rest
}) => (
  <div>
    {label && <label className="block text-sm font-medium mb-1">{label}</label>}
    <select
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      className={baseInput}
      {...rest}
    >
      {children ||
        options?.map((o) =>
          typeof o === "string" ? (
            <option key={o} value={o}>
              {o}
            </option>
          ) : (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ),
        )}
    </select>
  </div>
);

// Primary action button.
export const Button = ({
  children,
  variant = "primary",
  className = "",
  ...rest
}) => {
  const styles = {
    primary: "bg-primary text-primary-foreground hover:opacity-90",
    outline: "border border-border hover:bg-muted/30",
    danger: "bg-destructive text-destructive-foreground hover:opacity-90",
    ghost: "text-primary hover:underline",
  };
  return (
    <button
      {...rest}
      className={`px-4 py-2 rounded-md font-medium disabled:opacity-50 ${styles[variant]} ${className}`}
    >
      {children}
    </button>
  );
};

// Inline alert banner.
export const Alert = ({ tone = "error", children }) => {
  if (!children) return null;
  const cls =
    tone === "error"
      ? "border-destructive/40 bg-destructive/10 text-destructive"
      : tone === "success"
        ? "border-green-300 bg-green-50 text-green-700"
        : "border-accent/40 bg-accent/10 text-accent";
  return (
    <div className={`mb-4 p-3 rounded-md border text-sm ${cls}`}>
      {children}
    </div>
  );
};

// Status pill.
export const StatusPill = ({ status }) => {
  const cls =
    status === "approved"
      ? "bg-green-100 text-green-700"
      : status === "rejected"
        ? "bg-red-100 text-red-700"
        : "bg-amber-100 text-amber-700";
  return (
    <span
      className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${cls}`}
    >
      {status}
    </span>
  );
};

// Modal wrapper.
export const Modal = ({ open, onClose, title, children }) => {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-start sm:items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-lg shadow-xl w-full max-w-md p-5 sm:p-6 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <h2 className="text-lg font-semibold text-primary mb-4">{title}</h2>
        )}
        {children}
      </div>
    </div>
  );
};

// Card container.
export const Card = ({ children, className = "" }) => (
  <div className={`bg-card rounded-lg shadow p-4 sm:p-6 ${className}`}>
    {children}
  </div>
);

// Page header.
export const PageHeader = ({ title, subtitle, right }) => (
  <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
    <div>
      <h1 className="text-xl sm:text-2xl font-bold text-primary">{title}</h1>
      {subtitle && (
        <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
      )}
    </div>
    {right}
  </div>
);

/**
 * Reusable search input with leading icon and a clear button.
 * Use the same look across every list/table page in the app.
 *
 * Props:
 *  - value, onChange (string handler)
 *  - placeholder
 *  - className (extra wrapper classes)
 *  - autoFocus, ariaLabel
 */
export const SearchInput = ({
  value = "",
  onChange,
  placeholder = "Search…",
  className = "",
  autoFocus = false,
  ariaLabel,
}) => {
  return (
    <div className={`relative w-full sm:max-w-md ${className}`} role="search">
      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        aria-label={ariaLabel || placeholder}
        className="w-full pl-9 pr-9 py-2 text-sm rounded-md border border-border bg-card outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground/70 transition shadow-sm"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange?.("")}
          aria-label="Clear search"
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full text-muted-foreground hover:bg-muted/40 hover:text-foreground transition"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
