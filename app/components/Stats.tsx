import type { LeadStats } from "@/lib/types";

export function Stats({ stats }: { stats: LeadStats }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <Card label="Total leads" value={stats.total} tone="neutral" />
      <Card
        label="Ready for outbound"
        value={stats.outbound_ready}
        tone="ready"
      />
      <Card label="Excluded" value={stats.excluded} tone="excluded" />
    </div>
  );
}

function Card({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "neutral" | "ready" | "excluded";
}) {
  const ring =
    tone === "ready"
      ? "ring-emerald-500/30"
      : tone === "excluded"
        ? "ring-rose-500/30"
        : "ring-black/10 dark:ring-white/10";
  const accent =
    tone === "ready"
      ? "text-emerald-600 dark:text-emerald-400"
      : tone === "excluded"
        ? "text-rose-600 dark:text-rose-400"
        : "text-slate-700 dark:text-slate-200";
  return (
    <div
      className={`rounded-xl bg-white/70 p-4 shadow-sm ring-1 backdrop-blur dark:bg-white/5 ${ring}`}
    >
      <div className="text-xs uppercase tracking-wide opacity-60">{label}</div>
      <div className={`mt-1 text-2xl font-semibold tabular-nums ${accent}`}>
        {value}
      </div>
    </div>
  );
}
