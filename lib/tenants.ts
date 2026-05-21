import type { LeadStats } from "@/lib/types";

/**
 * Demo tenants. UUIDs are not secrets — these are public fixtures so the
 * app boots without env config. Override with DEMO_TENANT_A / _B in env.
 */
export const TENANTS = [
  {
    id:
      process.env.DEMO_TENANT_A ?? "00000000-0000-0000-0000-000000000001",
    label: "Tenant A — Acme",
    accent: "from-sky-500 to-indigo-500",
  },
  {
    id:
      process.env.DEMO_TENANT_B ?? "00000000-0000-0000-0000-000000000002",
    label: "Tenant B — Globex",
    accent: "from-fuchsia-500 to-rose-500",
  },
] as const;

export type TenantId = (typeof TENANTS)[number]["id"];

export const DEFAULT_TENANT_ID = TENANTS[0].id;

export const EMPTY_STATS: LeadStats = {
  total: 0,
  excluded: 0,
  outbound_ready: 0,
};

export function findTenant(id: string) {
  return TENANTS.find((t) => t.id === id) ?? TENANTS[0];
}

export function isKnownTenant(id: string): boolean {
  return TENANTS.some((t) => t.id === id);
}
