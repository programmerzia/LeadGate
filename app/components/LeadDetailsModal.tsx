"use client";

import { useEffect, useState, useTransition } from "react";
import type { Lead } from "@/lib/types";
import { deleteLeadAction } from "@/app/actions/leads";
import { StatusBadge } from "./StatusBadge";

export function LeadDetailsModal({
  lead,
  onClose,
  onDeleted,
}: {
  lead: Lead;
  onClose: () => void;
  onDeleted: (id: string) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Close on Escape.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleDelete = () => {
    setError(null);
    startTransition(async () => {
      const res = await deleteLeadAction(lead.tenant_id, lead.id);
      if (res.ok) {
        onDeleted(lead.id);
      } else {
        setError(res.error);
        setConfirming(false);
      }
    });
  };

  const copyEmail = async () => {
    if (!lead.contact_email) return;
    try {
      await navigator.clipboard.writeText(lead.contact_email);
    } catch {
      /* ignore — the demo doesn't need a toast for this */
    }
  };

  return (
    <div
      role="dialog"
      aria-modal
      aria-labelledby="lead-details-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
      />

      {/* Panel */}
      <div className="relative w-full max-w-md rounded-2xl border border-black/10 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-slate-900">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3
              id="lead-details-title"
              className="truncate text-lg font-semibold tracking-tight"
            >
              {lead.company_name}
            </h3>
            <div className="mt-1">
              <StatusBadge
                status={lead.status}
                reason={lead.exclusion_reason}
              />
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1 text-xl leading-none opacity-60 hover:bg-black/5 hover:opacity-100 dark:hover:bg-white/10"
          >
            ×
          </button>
        </div>

        <dl className="mt-5 grid grid-cols-1 gap-3 text-sm">
          <Row label="Lead ID" mono>
            {lead.id}
          </Row>
          <Row label="Workspace" mono>
            {lead.tenant_id}
          </Row>
          <Row label="Contact email">
            {lead.contact_email ? (
              <span className="flex items-center gap-2">
                <span className="font-mono break-all">
                  {lead.contact_email}
                </span>
                <button
                  onClick={copyEmail}
                  className="rounded border border-black/10 px-2 py-0.5 text-xs opacity-70 hover:opacity-100 dark:border-white/10"
                  title="Copy to clipboard"
                >
                  Copy
                </button>
              </span>
            ) : (
              <span className="opacity-50">Not provided</span>
            )}
          </Row>
          <Row label="Organization no.">
            {lead.org_number ?? (
              <span className="opacity-50">Not provided</span>
            )}
          </Row>
          <Row label="Created">
            {new Date(lead.created_at).toLocaleString()}
          </Row>
        </dl>

        {error ? (
          <div
            role="alert"
            className="mt-4 rounded-lg border border-rose-300/50 bg-rose-50 px-3 py-2 text-sm text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300"
          >
            {error}
          </div>
        ) : null}

        <div className="mt-6 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            disabled={pending}
            className="rounded-lg border border-black/10 px-3 py-1.5 text-sm font-medium hover:bg-black/5 disabled:opacity-50 dark:border-white/10 dark:hover:bg-white/10"
          >
            Close
          </button>

          {confirming ? (
            <div className="flex items-center gap-2">
              <span className="text-xs opacity-70">This cannot be undone.</span>
              <button
                onClick={() => setConfirming(false)}
                disabled={pending}
                className="rounded-lg border border-black/10 px-3 py-1.5 text-sm hover:bg-black/5 disabled:opacity-50 dark:border-white/10 dark:hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={pending}
                className="rounded-lg bg-rose-600 px-3 py-1.5 text-sm font-semibold text-white shadow hover:bg-rose-700 disabled:opacity-50"
              >
                {pending ? "Deleting…" : "Confirm delete"}
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirming(true)}
              className="rounded-lg border border-rose-300/50 bg-rose-50 px-3 py-1.5 text-sm font-semibold text-rose-700 hover:bg-rose-100 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300 dark:hover:bg-rose-500/20"
            >
              Delete lead
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  children,
  mono = false,
}: {
  label: string;
  children: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="grid grid-cols-[110px_1fr] gap-2">
      <dt className="text-xs uppercase tracking-wide opacity-60">{label}</dt>
      <dd className={mono ? "font-mono text-xs break-all" : ""}>{children}</dd>
    </div>
  );
}
