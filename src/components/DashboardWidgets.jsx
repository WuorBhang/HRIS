// Quick actions grid + recent activity panel (react-icons).
import { Link } from "wouter";
import { FileText, Download } from "lucide-react";
import { DOCUMENT_TYPE_LABELS } from "../lib/constants";
import { formatDate } from "../lib/utils";

// Icon button card.
export const QuickActions = ({ items = [] }) => (
  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
    {items.map((it) => {
      const Icon = it.icon;
      const inner = (
        <button
          type="button"
          onClick={() => {
            console.log("[QuickAction]", it.label, it.to || "");
            it.onClick?.();
          }}
          className="group w-full bg-card rounded-lg shadow p-4 flex flex-col items-center gap-2 text-center transition hover:shadow-md hover:-translate-y-0.5 hover:bg-primary hover:text-white"
        >
          <span className="w-11 h-11 rounded-full bg-primary/10 text-primary flex items-center justify-center transition group-hover:bg-white/20 group-hover:text-white">
            <Icon className="w-5 h-5" />
          </span>
          <span className="text-sm font-medium">{it.label}</span>
        </button>
      );
      return it.to ? (
        <Link key={it.label} href={it.to}>
          {inner}
        </Link>
      ) : (
        <div key={it.label}>{inner}</div>
      );
    })}
  </div>
);

// Recent activity list panel.
export const RecentActivity = ({
  items = [],
  formatTs,
  title = "Recent activity",
  emptyText = "No activity yet.",
}) => {
  const humanize = (s) => (s || "").replace(/_/g, " ").replace(/\./g, " · ");
  const tone = (a) =>
    a?.includes("delete") || a?.includes("disabled") || a?.includes("rejected")
      ? "bg-red-500"
      : a?.includes("approved") ||
          a?.includes("created") ||
          a?.includes("login")
        ? "bg-green-500"
        : "bg-amber-500";
  return (
    <div className="bg-card rounded-lg shadow p-4 sm:p-6">
      <h2 className="font-semibold text-primary mb-3">{title}</h2>
      {!items.length ? (
        <div className="text-sm text-muted-foreground py-6 text-center">
          {emptyText}
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {items.map((r) => (
            <li key={r.id} className="py-2.5 flex items-start gap-3">
              <span
                className={`w-2 h-2 rounded-full mt-2 shrink-0 ${tone(r.action)}`}
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm capitalize truncate">
                  {humanize(r.action)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatTs ? formatTs(r.createdAt) : ""}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

// Recent documents widget for employer/employee dashboards.
export const RecentDocuments = ({
  items = [],
  title = "Recent documents",
  viewAllHref,
  emptyText = "No documents yet.",
}) => (
  <div className="bg-card rounded-lg shadow p-4 sm:p-6">
    <div className="flex items-center justify-between mb-3">
      <h2 className="font-semibold text-primary">{title}</h2>
      {viewAllHref && (
        <Link href={viewAllHref}>
          <span className="text-xs text-primary hover:underline cursor-pointer">
            View all
          </span>
        </Link>
      )}
    </div>
    {!items.length ? (
      <div className="text-sm text-muted-foreground py-6 text-center">
        {emptyText}
      </div>
    ) : (
      <ul className="divide-y divide-border">
        {items.map((d) => (
          <li key={d.id} className="py-2.5 flex items-center gap-3 text-sm">
            <span className="w-9 h-9 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4" />
            </span>
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{d.title}</div>
              <div className="text-xs text-muted-foreground flex flex-wrap gap-x-2">
                <span>{DOCUMENT_TYPE_LABELS[d.type] || d.type}</span>
                {d.month && <span>· {d.month}</span>}
                <span>· {formatDate(d.uploadedAt)}</span>
              </div>
            </div>
            {d.url && (
              <a
                href={d.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-primary text-primary-foreground hover:opacity-90"
              >
                <Download className="w-3.5 h-3.5" /> Open
              </a>
            )}
          </li>
        ))}
      </ul>
    )}
  </div>
);
