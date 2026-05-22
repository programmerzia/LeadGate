import { isDisposableEmail } from "./disposable-domains";
import type { LeadInput, QualificationResult } from "./types";

/**
 * Qualify a lead for outbound contact.
 *
 * SINGLE SOURCE OF TRUTH for the qualification rule.
 * Pure function — no I/O, no side effects, no Date.now().
 * Same input always returns deeply-equal output.
 *
 * Rule (in order):
 *   1. Empty / whitespace email          → excluded / missing_email
 *   2. Disposable provider domain        → excluded / disposable_email
 *   3. Otherwise                         → outbound_ready
 *
 * @see .github/skills/lead-qualification/SKILL.md for the contract
 */
export function qualifyLead(input: LeadInput): QualificationResult {
  const email = (input.contact_email ?? "").trim();

  if (email === "") {
    return {
      status: "excluded",
      exclusion_reason: "missing_email",
      message:
        "No contact email on file. Held back from outbound and routed to enrichment.",
    };
  }

  if (isDisposableEmail(email)) {
    return {
      status: "excluded",
      exclusion_reason: "disposable_email",
      message:
        "Disposable email provider detected. Held back to protect sender reputation.",
    };
  }

  return {
    status: "outbound_ready",
    exclusion_reason: null,
    message: "Lead approved. Ready to enter the outbound sequence.",
  };
}
