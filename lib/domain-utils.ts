/**
 * Domain extraction and normalization utilities.
 *
 * Pure functions for email domain handling, shared across:
 * - Disposable email checking
 * - Suppression pattern validation
 * - Domain-based suppression matching
 */

/**
 * Extract the domain portion from an email address.
 *
 * Examples:
 *   extractDomain("user@example.com") → "example.com"
 *   extractDomain("USER@EXAMPLE.COM") → "example.com"  (lowercased)
 *   extractDomain("user@company@example.com") → "example.com"  (lastIndexOf)
 *   extractDomain("invalid") → null
 *   extractDomain("user@") → null
 *
 * @param email - The email address to extract from
 * @returns The lowercase domain, or null if the email is malformed
 */
export function extractDomain(email: string): string | null {
  const at = email.lastIndexOf("@");
  if (at === -1 || at === email.length - 1) return null;
  return email.slice(at + 1).trim().toLowerCase();
}

/**
 * Normalize a domain pattern for suppression storage.
 *
 * Validates and normalizes user-entered domain patterns. Rejects:
 * - Patterns starting with @ (use bare domain instead)
 * - Patterns shorter than 3 chars or without a dot
 * - Whitespace-only input
 *
 * Examples:
 *   normalizeDomainPattern("EXAMPLE.COM") → "example.com"
 *   normalizeDomainPattern("  example.com  ") → "example.com"
 *   normalizeDomainPattern("@example.com") → null  (rejected)
 *   normalizeDomainPattern(".com") → null  (too short)
 *   normalizeDomainPattern("example") → null  (no dot)
 *
 * @param input - The user-entered domain pattern
 * @returns The normalized domain, or null if invalid
 */
export function normalizeDomainPattern(input: string): string | null {
  const trimmed = input.trim().toLowerCase();

  // Reject @ prefix (user should enter bare domain)
  if (trimmed.startsWith("@")) return null;

  // Reject if too short or doesn't contain a dot
  if (trimmed.length < 3 || !trimmed.includes(".")) return null;

  // Reject if starts with a dot (e.g., ".com")
  if (trimmed.startsWith(".")) return null;

  return trimmed;
}
