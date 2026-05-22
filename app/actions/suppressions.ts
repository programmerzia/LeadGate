"use server";

import { z } from "zod";
import { getStore } from "@/lib/store";
import { isKnownTenant } from "@/lib/tenants";
import { normalizeDomainPattern } from "@/lib/domain-utils";
import type { Suppression, SuppressionKind } from "@/lib/types";

/**
 * Server Actions for suppression management.
 *
 * Security:
 *   - tenant_id must be a known UUID (closed allowlist for the demo).
 *   - All operations are scoped to the tenant.
 */

const AddSuppressionSchema = z
  .object({
    tenant_id: z.string().uuid(),
    kind: z.enum(["email", "domain"]), // unsubscribed is only added via unsubscribe flow
    pattern: z.string().trim().min(3).max(320),
  })
  .strict();

type AddSuppressionState =
  | {
      ok: true;
      suppression: Suppression;
    }
  | {
      ok: false;
      error: string;
      fieldErrors?: Record<string, string[]>;
    };

export async function addSuppressionAction(
  _prev: AddSuppressionState | null,
  formData: FormData,
): Promise<AddSuppressionState> {
  const raw = {
    tenant_id: String(formData.get("tenant_id") ?? ""),
    kind: String(formData.get("kind") ?? ""),
    pattern: String(formData.get("pattern") ?? ""),
  };

  const parsed = AddSuppressionSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Please fix the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { tenant_id, kind, pattern } = parsed.data;

  if (!isKnownTenant(tenant_id)) {
    return { ok: false, error: "Unknown tenant." };
  }

  // Validate pattern based on kind
  if (kind === "domain") {
    const normalized = normalizeDomainPattern(pattern);
    if (!normalized) {
      return {
        ok: false,
        error: "Please fix the highlighted fields.",
        fieldErrors: {
          pattern: [
            "Invalid domain. Use format: example.com (no @ prefix, must include dot)",
          ],
        },
      };
    }
  } else if (kind === "email") {
    const emailCheck = z.string().email().safeParse(pattern);
    if (!emailCheck.success) {
      return {
        ok: false,
        error: "Please fix the highlighted fields.",
        fieldErrors: { pattern: ["Not a valid email address."] },
      };
    }
  }

  try {
    const store = getStore();
    const suppression = await store.addSuppression(
      tenant_id,
      kind as SuppressionKind,
      pattern,
    );
    return { ok: true, suppression };
  } catch (err) {
    console.error("addSuppressionAction failed:", err);
    return {
      ok: false,
      error: "Could not add suppression. Please retry.",
    };
  }
}

const RemoveSuppressionSchema = z
  .object({
    tenant_id: z.string().uuid(),
    id: z.string().uuid(),
  })
  .strict();

type RemoveSuppressionState =
  | {
      ok: true;
    }
  | {
      ok: false;
      error: string;
    };

export async function removeSuppressionAction(
  _prev: RemoveSuppressionState | null,
  formData: FormData,
): Promise<RemoveSuppressionState> {
  const raw = {
    tenant_id: String(formData.get("tenant_id") ?? ""),
    id: String(formData.get("id") ?? ""),
  };

  const parsed = RemoveSuppressionSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Invalid request." };
  }

  const { tenant_id, id } = parsed.data;

  if (!isKnownTenant(tenant_id)) {
    return { ok: false, error: "Unknown tenant." };
  }

  try {
    const store = getStore();
    const removed = await store.removeSuppression(tenant_id, id);
    if (!removed) {
      return { ok: false, error: "Suppression not found." };
    }
    return { ok: true };
  } catch (err) {
    console.error("removeSuppressionAction failed:", err);
    return { ok: false, error: "Could not remove suppression. Please retry." };
  }
}
