import type { Lead, QualificationResult } from "@/lib/types";
import { StatusBadge } from "./StatusBadge";

export function LeadResult({
  lead,
  qualification,
}: {
  lead: Lead;
  qualification: QualificationResult;
}) {
  const ready = qualification.status === "outbound_ready";
  return (
    <div
      role="status"
      className={[
        "rounded-xl border p-4 shadow-sm transition",
        ready
          ? "border-emerald-300/50 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10"
          : "border-rose-300/50 bg-rose-50 dark:border-rose-500/30 dark:bg-rose-500/10",
      ].join(" ")}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold">Qualification result</span>
        <StatusBadge
          status={qualification.status}
          reason={qualification.exclusion_reason}
        />
      </div>
      <p className="mt-2 text-sm">{qualification.message}</p>
      <p className="mt-2 text-xs opacity-60">
        Recorded for <span className="font-medium">{lead.company_name}</span>
        <span className="opacity-60"> · ID </span>
        <span className="font-mono">{lead.id.slice(0, 8)}</span>
      </p>
    </div>
  );
}
