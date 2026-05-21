import "server-only";
import type { Lead, LeadStats, LeadStatus, ExclusionReason } from "@/lib/types";

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
  /** Backend identifier surfaced in the UI badge. */
  readonly backend: "supabase" | "memory";
}
