/**
 * Shared domain types for Lead Gate.
 *
 * Keep this file framework-free and free of runtime imports
 * (other than other type modules) so it can be consumed by both
 * server and client components.
 */

export const LEAD_STATUSES = ["raw", "excluded", "outbound_ready"] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const EXCLUSION_REASONS = [
  "missing_email",
  "disposable_email",
  "suppressed",
  "unsubscribed",
] as const;
export type ExclusionReason = (typeof EXCLUSION_REASONS)[number];

/** Input to qualifyLead — what comes off the form / API. */
export type LeadInput = {
  tenant_id: string;
  company_name: string;
  contact_email?: string | null;
  org_number?: string | null;
};

/** Result of the pure rule (no id / no timestamp). */
export type QualificationResult = {
  status: LeadStatus;
  exclusion_reason: ExclusionReason | null;
  message: string;
};

/** A persisted lead row. */
export type Lead = {
  id: string;
  tenant_id: string;
  company_name: string;
  contact_email: string | null;
  org_number: string | null;
  status: LeadStatus;
  exclusion_reason: ExclusionReason | null;
  created_at: string;
};

export type LeadStats = {
  total: number;
  excluded: number;
  outbound_ready: number;
};

/** Suppression kind — stored in tenant_suppressions table. */
export const SUPPRESSION_KINDS = ["email", "domain", "unsubscribed"] as const;
export type SuppressionKind = (typeof SUPPRESSION_KINDS)[number];

/** A suppression entry (manual block or unsubscribe). */
export type Suppression = {
  id: string;
  tenant_id: string;
  kind: SuppressionKind;
  pattern: string; // lowercase normalized email or domain
  created_at: string;
};
