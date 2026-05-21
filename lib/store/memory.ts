import "server-only";
import { randomUUID } from "node:crypto";
import type { Lead } from "@/lib/types";
import type { LeadStore, NewLead } from "./types";

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

class MemoryStore implements LeadStore {
  readonly backend = "memory" as const;

  async insert(lead: NewLead): Promise<Lead> {
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
}

let instance: MemoryStore | null = null;
export function getMemoryStore(): MemoryStore {
  if (!instance) instance = new MemoryStore();
  return instance;
}
