import "server-only";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getMemoryStore } from "./memory";
import { SupabaseStore } from "./supabase";
import type { LeadStore } from "./types";

/**
 * Returns the active lead store.
 *
 *   • Supabase if NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are set.
 *   • In-memory fallback otherwise — so the app boots cleanly before the
 *     user wires Supabase.
 *
 * Decision documented in docs/ADR-003-storage-fallback.md.
 */
export function getStore(): LeadStore {
  const sb = getSupabaseServer();
  if (sb) return new SupabaseStore(sb);
  return getMemoryStore();
}

export type { LeadStore } from "./types";
