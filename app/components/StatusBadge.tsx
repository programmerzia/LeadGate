import type { LeadStatus, ExclusionReason } from "@/lib/types";

const STATUS_STYLES: Record<LeadStatus, { label: string; classes: string }> = {
  raw: {
    label: "Raw",
    classes:
      "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-800/60 dark:text-slate-200 dark:ring-slate-700",
  },
  outbound_ready: {
    label: "Outbound ready",
    classes:
      "bg-emerald-100 text-emerald-800 ring-emerald-300 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/30",
  },
  excluded: {
    label: "Excluded",
    classes:
      "bg-rose-100 text-rose-800 ring-rose-300 dark:bg-rose-500/15 dark:text-rose-300 dark:ring-rose-500/30",
  },
};

const REASON_LABELS: Record<ExclusionReason, string> = {
  missing_email: "missing email",
  disposable_email: "disposable email",
};

export function StatusBadge({
  status,
  reason,
}: {
  status: LeadStatus;
  reason?: ExclusionReason | null;
}) {
  const s = STATUS_STYLES[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${s.classes}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          status === "outbound_ready"
            ? "bg-emerald-500"
            : status === "excluded"
              ? "bg-rose-500"
              : "bg-slate-400"
        }`}
      />
      {s.label}
      {reason ? (
        <span className="opacity-70">· {REASON_LABELS[reason]}</span>
      ) : null}
    </span>
  );
}
