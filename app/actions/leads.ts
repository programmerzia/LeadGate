"use server";

import { z } from "zod";
import { qualifyLead } from "@/lib/qualifyLead";
import { getStore } from "@/lib/store";
import { isKnownTenant } from "@/lib/tenants";
import type { Lead, LeadStats, QualificationResult } from "@/lib/types";

/**
 * Server Actions for the Lead Gate UI.
 *
 * Pipeline (see .github/copilot-instructions.md §2 + §5):
 *   form -> validate (Zod, strict) -> qualifyLead (pure) -> store.insert -> return
 *
 * Security:
 *   - tenant_id must be a known UUID (closed allowlist for the demo).
 *   - We never echo back contact_email in error responses.
 *   - We never log raw form data.
 */

const SubmitSchema = z
  .object({
    tenant_id: z.string().uuid(),
    company_name: z
      .string()
      .trim()
      .min(1, "Company name is required.")
      .max(200, "Company name is too long."),
    // contact_email may be empty / whitespace — that is the "missing_email"
    // happy path. We trim and normalise instead of rejecting.
    contact_email: z
      .string()
      .trim()
      .max(320)
      .optional()
      .transform((v) => (v && v.length > 0 ? v : null)),
    org_number: z
      .string()
      .trim()
      .max(64)
      .optional()
      .transform((v) => (v && v.length > 0 ? v : null)),
  })
  .strict();

export type SubmitState =
  | {
      ok: true;
      lead: Lead;
      qualification: QualificationResult;
      backend: "supabase" | "memory";
    }
  | {
      ok: false;
      error: string;
      fieldErrors?: Record<string, string[]>;
    };

export async function submitLeadAction(
  _prev: SubmitState | null,
  formData: FormData,
): Promise<SubmitState> {
  // Convert FormData → plain object (only known fields).
  const raw = {
    tenant_id: String(formData.get("tenant_id") ?? ""),
    company_name: String(formData.get("company_name") ?? ""),
    contact_email: String(formData.get("contact_email") ?? ""),
    org_number: String(formData.get("org_number") ?? ""),
  };

  const parsed = SubmitSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Please fix the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const input = parsed.data;

  // Defence in depth: allowlist of demo tenants. Real apps would derive
  // this from the authenticated session.
  if (!isKnownTenant(input.tenant_id)) {
    return { ok: false, error: "Unknown tenant." };
  }

  // If a non-empty value passed length checks but is not an email,
  // surface it as a field error (don't store malformed addresses).
  if (input.contact_email !== null) {
    const emailCheck = z.string().email().safeParse(input.contact_email);
    if (!emailCheck.success) {
      return {
        ok: false,
        error: "Please fix the highlighted fields.",
        fieldErrors: { contact_email: ["Not a valid email address."] },
      };
    }
  }

  const qualification = qualifyLead(input);

  try {
    const store = getStore();
    const lead = await store.insert({
      tenant_id: input.tenant_id,
      company_name: input.company_name,
      contact_email: input.contact_email,
      org_number: input.org_number,
      status: qualification.status,
      exclusion_reason: qualification.exclusion_reason,
    });
    return {
      ok: true,
      lead,
      qualification,
      backend: store.backend,
    };
  } catch (err) {
    // Do NOT include user input in the message surfaced to other tenants.
    console.error("submitLeadAction insert failed:", err);
    return {
      ok: false,
      error: "Could not save the lead. Please retry.",
    };
  }
}

export async function listLeadsAction(
  tenantId: string,
): Promise<{
  leads: Lead[];
  stats: LeadStats;
  backend: "supabase" | "memory";
}> {
  if (!isKnownTenant(tenantId)) {
    return {
      leads: [],
      stats: { total: 0, excluded: 0, outbound_ready: 0 },
      backend: "memory",
    };
  }
  const store = getStore();
  const [leads, stats] = await Promise.all([
    store.listByTenant(tenantId, 20),
    store.statsByTenant(tenantId),
  ]);
  return { leads, stats, backend: store.backend };
}

const DeleteSchema = z
  .object({
    tenant_id: z.string().uuid(),
    id: z.string().uuid(),
  })
  .strict();

export type DeleteResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

export async function deleteLeadAction(
  tenantId: string,
  id: string,
): Promise<DeleteResult> {
  const parsed = DeleteSchema.safeParse({ tenant_id: tenantId, id });
  if (!parsed.success) {
    return { ok: false, error: "Invalid input." };
  }
  if (!isKnownTenant(parsed.data.tenant_id)) {
    return { ok: false, error: "Unknown tenant." };
  }
  try {
    const store = getStore();
    const removed = await store.deleteById(
      parsed.data.tenant_id,
      parsed.data.id,
    );
    if (!removed) {
      // Either the row doesn't exist OR it belongs to another tenant.
      // Same surface message in both cases — do not leak existence.
      return { ok: false, error: "Lead not found." };
    }
    return { ok: true, id: parsed.data.id };
  } catch (err) {
    console.error("deleteLeadAction failed:", err);
    return { ok: false, error: "Could not delete the lead. Please retry." };
  }
}
