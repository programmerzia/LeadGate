"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { listLeadsAction, type SubmitState } from "@/app/actions/leads";
import { TENANTS, EMPTY_STATS, findTenant } from "@/lib/tenants";
import type { Lead, LeadStats, QualificationResult, Suppression } from "@/lib/types";
import { TenantSelector } from "./TenantSelector";
import { Stats } from "./Stats";
import { LeadList } from "./LeadList";
import { LeadForm } from "./LeadForm";
import { LeadResult } from "./LeadResult";
import { SuppressionsPanel } from "./SuppressionsPanel";

type LastDecision = {
  lead: Lead;
  qualification: QualificationResult;
} | null;

export function Dashboard({
  initialTenantId,
  initialLeads,
  initialStats,
  initialSuppressions,
  backend,
}: {
  initialTenantId: string;
  initialLeads: Lead[];
  initialStats: LeadStats;
  initialSuppressions: Suppression[];
  backend: "supabase" | "memory";
}) {
  const [tenantId, setTenantId] = useState(initialTenantId);
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [stats, setStats] = useState<LeadStats>(initialStats);
  const [suppressions, setSuppressions] = useState<Suppression[]>(initialSuppressions);
  const [last, setLast] = useState<LastDecision>(null);
  const [isPending, startTransition] = useTransition();
  const tenant = findTenant(tenantId);
  // Avoid the redundant fetch on first render — the page already passed
  // initialLeads / initialStats for `initialTenantId`.
  const isFirstRenderRef = useRef(true);

  const refresh = useCallback((id: string) => {
    startTransition(async () => {
      const data = await listLeadsAction(id);
      setLeads(data.leads);
      setStats(data.stats);
      setSuppressions(data.suppressions);
    });
  }, []);

  // Refresh whenever the tenant changes (after the first render).
  // Bug fix: previously we only refreshed when `tenantId !== initialTenantId`,
  // so going A → B → A skipped the reload and showed B's empty state.
  useEffect(() => {
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      return;
    }
    setLast(null);
    refresh(tenantId);
  }, [tenantId, refresh]);

  const handleSuccess = useCallback(
    (state: Extract<SubmitState, { ok: true }>) => {
      setLast({ lead: state.lead, qualification: state.qualification });
      refresh(tenantId);
    },
    [refresh, tenantId],
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <TenantSelector
          value={tenantId}
          onChange={setTenantId}
          disabled={isPending}
        />
        <BackendBadge backend={backend} />
      </div>

      <Stats stats={stats} />

      <div className="grid gap-6 md:grid-cols-2">
        <section
          className={`rounded-2xl border border-black/10 bg-white/70 p-5 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5`}
        >
          <header className="mb-4 flex items-center gap-2">
            <span
              aria-hidden
              className={`h-2 w-2 rounded-full bg-gradient-to-r ${tenant.accent}`}
            />
            <h2 className="text-sm font-semibold tracking-tight">Add a lead</h2>
            <span className="ml-auto text-xs opacity-50">{tenant.label}</span>
          </header>
          <LeadForm tenantId={tenantId} onSuccess={handleSuccess} />
          {last ? (
            <div className="mt-4">
              <LeadResult lead={last.lead} qualification={last.qualification} />
            </div>
          ) : null}
        </section>

        <section className="rounded-2xl border border-black/10 bg-white/70 p-5 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
          <header className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold tracking-tight">
              Recent activity
            </h2>
            <span className="text-xs opacity-50">
              {isPending
                ? "Refreshing…"
                : leads.length === 0
                  ? "No records yet"
                  : `Showing ${leads.length}`}
            </span>
          </header>
          <LeadList leads={leads} onChanged={() => refresh(tenantId)} />
        </section>
      </div>

      <SuppressionsPanel tenantId={tenantId} suppressions={suppressions} />

      <p className="rounded-lg border border-dashed border-black/10 px-4 py-3 text-xs opacity-70 dark:border-white/10">
        <strong className="font-semibold">Workspace isolation.</strong>{" "}
        Switching workspaces above only loads the active workspace&apos;s
        records. Each row is bound to its workspace at write time, filtered on
        every read, and protected by row-level security at the database.
      </p>
    </div>
  );
}

function BackendBadge({ backend }: { backend: "supabase" | "memory" }) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1",
        backend === "supabase"
          ? "bg-emerald-100 text-emerald-800 ring-emerald-300 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/30"
          : "bg-amber-100 text-amber-800 ring-amber-300 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/30",
      ].join(" ")}
      title={
        backend === "supabase"
          ? "Connected to Supabase. Server-side service-role client; row-level security enforced."
          : "Local in-memory store — records reset on server restart. Add NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to switch automatically."
      }
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          backend === "supabase" ? "bg-emerald-500" : "bg-amber-500"
        }`}
      />
      {backend === "supabase" ? "Live database" : "Local store"}
    </span>
  );
}

export const ALL_TENANTS = TENANTS;
export const EMPTY = EMPTY_STATS;
