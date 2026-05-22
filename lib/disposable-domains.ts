import { extractDomain } from "./domain-utils";

/**
 * Disposable / temporary email domains we refuse for outbound.
 *
 * Source: curated short list — common providers seen in fake signups.
 * In production this list would be loaded from a maintained dataset
 * (e.g. disposable-email-domains GitHub list) refreshed periodically.
 *
 * Stored as a Set for O(1) lookup; readonly to prevent runtime mutation.
 */
export const DISPOSABLE_DOMAINS: ReadonlySet<string> = new Set([
  "mailinator.com",
  "tempmail.com",
  "10minutemail.com",
  "guerrillamail.com",
  "yopmail.com",
  "trashmail.com",
  "throwawaymail.com",
  "getnada.com",
  "sharklasers.com",
  "maildrop.cc",
]);

/**
 * Returns true when `email`'s domain (case-insensitive, exact match)
 * appears in DISPOSABLE_DOMAINS. Returns false for malformed input.
 */
export function isDisposableEmail(email: string): boolean {
  const domain = extractDomain(email);
  if (!domain) return false;
  return DISPOSABLE_DOMAINS.has(domain);
}

