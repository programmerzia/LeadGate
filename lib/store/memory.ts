import "server-only";
import { randomUUID } from "node:crypto";
import type { Lead, Suppression, SuppressionKind } from "@/lib/types";
import type { LeadStore, NewLead } from "./types";
import { extractDomain } from "@/lib/domain-utils";

/**
 * In-memory fallback store.
 *
 * Used when Supabase env vars are not yet configured. Data is lost on
 * server restart. Useful for local dev, the first demo run, and tests.
 *
 * Multi-tenancy invariant is preserved: every read filters by tenant_id.
 */

// Module-level Map survives across requests in the same dev server process.
// In production with multiple replicas this would not be coherent — by
// design, we only use it as a dev fallback (see ADR-003).
const rows: Lead[] = [];
const suppressions: Suppression[] = [];

class MemoryStore implements LeadStore {
  readonly backend = "memory" as const;

  async insert(lead: NewLead): Promise<Lead> {
    // Check for duplicate email (case-insensitive) within tenant
    if (lead.contact_email) {
      const emailLower = lead.contact_email.toLowerCase();
      const duplicate = rows.find(
        (r) =>
          r.tenant_id === lead.tenant_id &&
          r.contact_email?.toLowerCase() === emailLower,
      );
      if (duplicate) {
        // Simulate Postgres UNIQUE index violation
        const error = new Error("duplicate key value violates unique constraint");
        (error as any).code = "23505";
        (error as any).constraint = "leads_tenant_email_lower_uniq";
        throw error;
      }
    }

    const row: Lead = {
      id: randomUUID(),
      created_at: new Date().toISOString(),
      ...lead,
    };
    rows.push(row);
    return row;
  }

  async listByTenant(tenantId: string, limit = 20): Promise<Lead[]> {
    return rows
      .filter((r) => r.tenant_id === tenantId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, limit);
  }

  async statsByTenant(tenantId: string) {
    const t = rows.filter((r) => r.tenant_id === tenantId);
    return {
      total: t.length,
      excluded: t.filter((r) => r.status === "excluded").length,
      outbound_ready: t.filter((r) => r.status === "outbound_ready").length,
    };
  }

  async deleteById(tenantId: string, id: string): Promise<boolean> {
    // Tenant-scoped delete: only remove if BOTH id and tenant_id match.
    const idx = rows.findIndex((r) => r.id === id && r.tenant_id === tenantId);
    if (idx === -1) return false;
    rows.splice(idx, 1);
    return true;
  }

  async checkSuppression(
    tenantId: string,
    email: string,
  ): Promise<"suppressed" | "unsubscribed" | null> {
    const emailLower = email.toLowerCase();
    const domain = extractDomain(email);

    // Check email-exact match
    const emailMatch = suppressions.find(
      (s) =>
        s.tenant_id === tenantId &&
        s.kind === "email" &&
        s.pattern === emailLower,
    );
    if (emailMatch) return "suppressed";

    // Check unsubscribed (matches domain)
    if (domain) {
      const unsubMatch = suppressions.find(
        (s) =>
          s.tenant_id === tenantId &&
          s.kind === "unsubscribed" &&
          s.pattern === domain,
      );
      if (unsubMatch) return "unsubscribed";

      // Check domain-based suppression
      const domainMatch = suppressions.find(
        (s) =>
          s.tenant_id === tenantId &&
          s.kind === "domain" &&
          s.pattern === domain,
      );
      if (domainMatch) return "suppressed";
    }

    return null;
  }

  async listSuppressions(tenantId: string): Promise<Suppression[]> {
    return suppressions
      .filter((s) => s.tenant_id === tenantId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  async addSuppression(
    tenantId: string,
    kind: SuppressionKind,
    pattern: string,
  ): Promise<Suppression> {
    const normalizedPattern = pattern.trim().toLowerCase();

    // Check for existing (idempotent)
    const existing = suppressions.find(
      (s) =>
        s.tenant_id === tenantId &&
        s.kind === kind &&
        s.pattern === normalizedPattern,
    );
    if (existing) return existing;

    const suppression: Suppression = {
      id: randomUUID(),
      tenant_id: tenantId,
      kind,
      pattern: normalizedPattern,
      created_at: new Date().toISOString(),
    };
    suppressions.push(suppression);
    return suppression;
  }

  async removeSuppression(tenantId: string, id: string): Promise<boolean> {
    const idx = suppressions.findIndex(
      (s) => s.id === id && s.tenant_id === tenantId,
    );
    if (idx === -1) return false;
    suppressions.splice(idx, 1);
    return true;
  }
}

let instance: MemoryStore | null = null;
export function getMemoryStore(): MemoryStore {
  if (!instance) instance = new MemoryStore();
  return instance;
}
