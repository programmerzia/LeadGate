"use server";

import { getStore } from "@/lib/store";
import { verify } from "@/lib/unsubscribe-token";
import { extractDomain } from "@/lib/domain-utils";

/**
 * Server Action for confirming unsubscribe.
 *
 * Verifies the token, adds a suppression with kind='unsubscribed',
 * and returns success. Idempotent — re-clicking the same link is safe.
 */

type ConfirmUnsubscribeState =
  | {
      ok: true;
      email: string;
    }
  | {
      ok: false;
      error: string;
    };

export async function confirmUnsubscribeAction(
  token: string,
): Promise<ConfirmUnsubscribeState> {
  const payload = verify(token);

  if (!payload) {
    return {
      ok: false,
      error:
        "Invalid or expired unsubscribe link. Please contact support if you believe this is an error.",
    };
  }

  const { tenant_id, email } = payload;
  const domain = extractDomain(email);

  if (!domain) {
    return {
      ok: false,
      error: "Invalid email in unsubscribe token.",
    };
  }

  try {
    const store = getStore();

    // Add suppression with kind='unsubscribed' (matches domain, not full email)
    // This is idempotent — if already unsubscribed, returns existing
    await store.addSuppression(tenant_id, "unsubscribed", domain);

    return { ok: true, email };
  } catch (err) {
    console.error("confirmUnsubscribeAction failed:", err);
    return {
      ok: false,
      error: "Could not process unsubscribe request. Please retry.",
    };
  }
}
