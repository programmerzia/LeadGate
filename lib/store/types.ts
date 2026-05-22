import "server-only";
import type {
  Lead,
  LeadStats,
  LeadStatus,
  ExclusionReason,
  Suppression,
  SuppressionKind,
} from "@/lib/types";

export type NewLead = {
  tenant_id: string;
  company_name: string;
  contact_email: string | null;
  org_number: string | null;
  status: LeadStatus;
  exclusion_reason: ExclusionReason | null;
};

/**
 * Storage contract — implemented by both the Supabase store and the
 * in-memory fallback. The Server Action depends on this interface only.
 */
export interface LeadStore {
  insert(lead: NewLead): Promise<Lead>;
  listByTenant(tenantId: string, limit?: number): Promise<Lead[]>;
  statsByTenant(tenantId: string): Promise<LeadStats>;
  /**
   * Delete a lead. MUST scope by `tenantId` to prevent cross-tenant deletes
   * even if a caller passes an `id` from another tenant. Returns true if a
   * row was actually removed; false if no match (silently treated as no-op).
   */
  deleteById(tenantId: string, id: string): Promise<boolean>;

  /**
   * Check if an email (or its domain) is suppressed or unsubscribed.
   * Returns 'unsubscribed' if kind='unsubscribed', 'suppressed' for manual blocks,
   * or null if not found.
   */
  checkSuppression(
    tenantId: string,
    email: string,
  ): Promise<"suppressed" | "unsubscribed" | null>;

  /**
   * List all suppressions for a tenant (no limit — show all in UI).
   */
  listSuppressions(tenantId: string): Promise<Suppression[]>;

  /**
   * Add a suppression. Normalizes pattern (lowercase + trim). Returns the new
   * suppression, or existing one on UNIQUE constraint violation (idempotent).
   */
  addSuppression(
    tenantId: string,
    kind: SuppressionKind,
    pattern: string,
  ): Promise<Suppression>;

  /**
   * Remove a suppression by id, scoped to tenant. Returns true if deleted,
   * false if not found.
   */
  removeSuppression(tenantId: string, id: string): Promise<boolean>;

  /** Backend identifier surfaced in the UI badge. */
  readonly backend: "supabase" | "memory";
}
