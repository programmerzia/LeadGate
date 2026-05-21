"use client";

import { useState, useTransition } from "react";
import type { Lead } from "@/lib/types";
import { deleteLeadAction } from "@/app/actions/leads";
import { StatusBadge } from "./StatusBadge";
import { LeadDetailsModal } from "./LeadDetailsModal";

/**
 * Mask the local part of an email so we never render full PII to UI
 * that may be captured in screenshots.  e.g. f***@acme.no
 */
function maskEmail(email: string | null): string {
  if (!email) return "—";
  const [local, domain] = email.split("@");
  if (!local || !domain) return "—";
  const head = local.slice(0, 1);
  return `${head}${"*".repeat(Math.max(1, local.length - 1))}@${domain}`;
}

function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export function LeadList({
  leads,
  onChanged,
}: {
  leads: Lead[];
  /** Called after a successful delete so the parent can refresh list + stats. */
  onChanged: () => void;
}) {
  const [viewing, setViewing] = useState<Lead | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const handleQuickDelete = (lead: Lead) => {
    startTransition(async () => {
      const res = await deleteLeadAction(lead.tenant_id, lead.id);
      setConfirmId(null);
      if (res.ok) onChanged();
    });
  };

  if (leads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-black/10 bg-white/40 px-6 py-12 text-center dark:border-white/10 dark:bg-white/5">
        <div
          aria-hidden
          className="mb-3 grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-slate-100 to-slate-200 text-slate-400 dark:from-slate-800 dark:to-slate-700"
        >
          ∅
        </div>
        <p className="text-sm font-medium">No leads yet for this tenant</p>
        <p className="mt-1 text-xs opacity-60">
          Submit the form to add your first lead.
        </p>
      </div>
    );
  }

  return (
    <>
      <ul className="divide-y divide-black/5 overflow-hidden rounded-xl border border-black/10 bg-white/70 shadow-sm backdrop-blur dark:divide-white/5 dark:border-white/10 dark:bg-white/5">
        {leads.map((lead) => {
          const isConfirming = confirmId === lead.id;
          return (
            <li
              key={lead.id}
              className="flex items-center justify-between gap-3 px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium">
                    {lead.company_name}
                  </span>
                  {lead.org_number ? (
                    <span className="rounded bg-black/5 px-1.5 py-0.5 font-mono text-[10px] opacity-70 dark:bg-white/10">
                      {lead.org_number}
                    </span>
                  ) : null}
                </div>
                <div className="mt-0.5 truncate font-mono text-xs opacity-60">
                  {maskEmail(lead.contact_email)}
                </div>
              </div>

              <div className="flex shrink-0 flex-col items-end gap-1.5">
                <StatusBadge
                  status={lead.status}
                  reason={lead.exclusion_reason}
                />
                <div className="flex items-center gap-1">
                  <span className="mr-1 text-[10px] opacity-50">
                    {timeAgo(lead.created_at)}
                  </span>
                  <IconButton
                    label="View details"
                    onClick={() => setViewing(lead)}
                  >
                    <EyeIcon />
                  </IconButton>
                  {isConfirming ? (
                    <>
                      <button
                        onClick={() => setConfirmId(null)}
                        disabled={pending}
                        className="rounded border border-black/10 px-2 py-0.5 text-[11px] hover:bg-black/5 disabled:opacity-50 dark:border-white/10 dark:hover:bg-white/10"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleQuickDelete(lead)}
                        disabled={pending}
                        className="rounded bg-rose-600 px-2 py-0.5 text-[11px] font-semibold text-white shadow hover:bg-rose-700 disabled:opacity-50"
                      >
                        {pending ? "…" : "Delete"}
                      </button>
                    </>
                  ) : (
                    <IconButton
                      label="Delete lead"
                      tone="danger"
                      onClick={() => setConfirmId(lead.id)}
                    >
                      <TrashIcon />
                    </IconButton>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {viewing ? (
        <LeadDetailsModal
          lead={viewing}
          onClose={() => setViewing(null)}
          onDeleted={() => {
            setViewing(null);
            onChanged();
          }}
        />
      ) : null}
    </>
  );
}

function IconButton({
  label,
  onClick,
  tone = "default",
  children,
}: {
  label: string;
  onClick: () => void;
  tone?: "default" | "danger";
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={[
        "grid h-6 w-6 place-items-center rounded-md border transition",
        tone === "danger"
          ? "border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-500/30 dark:text-rose-400 dark:hover:bg-rose-500/10"
          : "border-black/10 opacity-70 hover:bg-black/5 hover:opacity-100 dark:border-white/10 dark:hover:bg-white/10",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function EyeIcon() {
  return (
    <svg
      aria-hidden
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      aria-hidden
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}
