import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Lead, Suppression, SuppressionKind } from "@/lib/types";
import type { LeadStore, NewLead } from "./types";
import { extractDomain } from "@/lib/domain-utils";

/**
 * Supabase-backed lead store.
 *
 * Every read filters by `tenant_id` explicitly. The service-role client
 * bypasses RLS, so this code is the LAST line of defence — keep the
 * tenant filter on every query.
 */
export class SupabaseStore implements LeadStore {
  readonly backend = "supabase" as const;
  constructor(private readonly client: SupabaseClient) {}

  async insert(lead: NewLead): Promise<Lead> {
    const { data, error } = await this.client
      .from("leads")
      .insert({
        tenant_id: lead.tenant_id,
        company_name: lead.company_name,
        contact_email: lead.contact_email,
        org_number: lead.org_number,
        status: lead.status,
        exclusion_reason: lead.exclusion_reason,
      })
      .select("*")
      .single();

    if (error) throw new Error(`leads.insert failed: ${error.message}`);
    return data as Lead;
  }

  async listByTenant(tenantId: string, limit = 20): Promise<Lead[]> {
    const { data, error } = await this.client
      .from("leads")
      .select("*")
      .eq("tenant_id", tenantId) // tenant filter — never remove
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw new Error(`leads.list failed: ${error.message}`);
    return (data ?? []) as Lead[];
  }

  async statsByTenant(tenantId: string) {
    // Three small head queries are cheap and avoid a custom RPC for the demo.
    const total = await this.count(tenantId, undefined);
    const excluded = await this.count(tenantId, "excluded");
    const ready = await this.count(tenantId, "outbound_ready");
    return { total, excluded, outbound_ready: ready };
  }

  private async count(tenantId: string, status?: string): Promise<number> {
    let q = this.client
      .from("leads")
      .select("*", { count: "exact", head: true })
      .eq("tenant_id", tenantId);
    if (status) q = q.eq("status", status);
    const { count, error } = await q;
    if (error) throw new Error(`leads.count failed: ${error.message}`);
    return count ?? 0;
  }

  async deleteById(tenantId: string, id: string): Promise<boolean> {
    // Tenant-scoped delete — the .eq("tenant_id", ...) here is the security
    // boundary. Service-role bypasses RLS, so this filter is the ONLY thing
    // stopping a cross-tenant delete.
    const { data, error } = await this.client
      .from("leads")
      .delete()
      .eq("tenant_id", tenantId)
      .eq("id", id)
      .select("id");
    if (error) throw new Error(`leads.delete failed: ${error.message}`);
    return (data?.length ?? 0) > 0;
  }

  async checkSuppression(
    tenantId: string,
    email: string,
  ): Promise<"suppressed" | "unsubscribed" | null> {
    const emailLower = email.toLowerCase();
    const domain = extractDomain(email);

    // Single query with OR logic to check email, domain, and unsubscribed
    const { data, error} = await this.client
      .from("tenant_suppressions")
      .select("kind")
      .eq("tenant_id", tenantId)
      .or(
        `and(kind.eq.email,pattern.eq.${emailLower}),` +
        (domain ? `and(kind.eq.domain,pattern.eq.${domain}),and(kind.eq.unsubscribed,pattern.eq.${domain})` : ""),
      )
      .limit(1)
      .maybeSingle();

    if (error) throw new Error(`suppressions.check failed: ${error.message}`);
    if (!data) return null;

    return data.kind === "unsubscribed" ? "unsubscribed" : "suppressed";
  }

  async listSuppressions(tenantId: string): Promise<Suppression[]> {
    const { data, error } = await this.client
      .from("tenant_suppressions")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false });

    if (error)
      throw new Error(`suppressions.list failed: ${error.message}`);
    return (data ?? []) as Suppression[];
  }

  async addSuppression(
    tenantId: string,
    kind: SuppressionKind,
    pattern: string,
  ): Promise<Suppression> {
    const normalizedPattern = pattern.trim().toLowerCase();

    const { data, error } = await this.client
      .from("tenant_suppressions")
      .insert({
        tenant_id: tenantId,
        kind,
        pattern: normalizedPattern,
      })
      .select("*")
      .single();

    // Handle UNIQUE constraint violation (idempotent)
    if (error) {
      if (error.code === "23505") {
        // Fetch existing
        const { data: existing } = await this.client
          .from("tenant_suppressions")
          .select("*")
          .eq("tenant_id", tenantId)
          .eq("kind", kind)
          .eq("pattern", normalizedPattern)
          .single();
        if (existing) return existing as Suppression;
      }
      throw new Error(`suppressions.add failed: ${error.message}`);
    }

    return data as Suppression;
  }

  async removeSuppression(tenantId: string, id: string): Promise<boolean> {
    const { data, error } = await this.client
      .from("tenant_suppressions")
      .delete()
      .eq("tenant_id", tenantId)
      .eq("id", id)
      .select("id");

    if (error)
      throw new Error(`suppressions.remove failed: ${error.message}`);
    return (data?.length ?? 0) > 0;
  }
}
