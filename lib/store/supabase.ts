import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Lead } from "@/lib/types";
import type { LeadStore, NewLead } from "./types";

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
}
