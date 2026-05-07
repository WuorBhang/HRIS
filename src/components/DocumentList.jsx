// Document list with download links (Supabase URLs).
import { FileText, Download } from "lucide-react";
import { formatDate } from "../lib/utils";
import { DOCUMENT_TYPE_LABELS } from "../lib/constants";

export default function DocumentList({
  documents = [],
  emptyText = "No documents yet.",
}) {
  if (!documents.length)
    return (
      <div className="bg-card rounded-lg shadow p-10 text-center text-sm text-muted-foreground">
        {emptyText}
      </div>
    );
  return (
    <ul className="bg-card rounded-lg shadow divide-y divide-border">
      {documents.map((d) => (
        <li
          key={d.id}
          className="p-4 flex items-start sm:items-center gap-3 flex-col sm:flex-row"
        >
          <div className="w-10 h-10 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium truncate">{d.title}</div>
            <div className="text-xs text-muted-foreground mt-0.5 flex flex-wrap gap-x-3">
              <span className="px-2 py-0.5 rounded-full bg-muted/50 font-medium">
                {DOCUMENT_TYPE_LABELS[d.type] || d.type}
              </span>
              {d.month && <span>{d.month}</span>}
              <span>Uploaded {formatDate(d.uploadedAt)}</span>
            </div>
          </div>
          <a
            href={d.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm hover:opacity-90 self-stretch sm:self-auto justify-center"
          >
            <Download className="w-4 h-4" /> View / Download
          </a>
        </li>
      ))}
    </ul>
  );
}
