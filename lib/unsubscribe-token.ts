import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Unsubscribe token signing and verification.
 *
 * Tokens are stateless, permanent (no expiration), and scoped to tenant.
 * Format: {base64url(payload)}.{base64url(hmac)}
 *
 * The secret is loaded from UNSUBSCRIBE_SECRET env var. If not set, a random
 * session-specific secret is generated (dev fallback — tokens work but expire
 * on restart).
 */

type TokenPayload = {
  tenant_id: string;
  email: string;
};

let SECRET: string | null = null;
let warnedOnce = false;

function getSecret(): string {
  if (SECRET) return SECRET;

  SECRET = process.env.UNSUBSCRIBE_SECRET ?? null;

  if (!SECRET) {
    // Dev fallback: generate random secret, warn once
    SECRET = randomBytes(32).toString("hex");
    if (!warnedOnce) {
      console.warn(
        `⚠️  UNSUBSCRIBE_SECRET not set. Generated temporary secret: ${SECRET}`,
      );
      console.warn(
        `   Tokens will be invalidated on server restart. Add to .env.local for production.`,
      );
      warnedOnce = true;
    }
  }

  return SECRET;
}

function base64urlEncode(buf: Buffer): string {
  return buf.toString("base64url");
}

function base64urlDecode(str: string): Buffer {
  return Buffer.from(str, "base64url");
}

/**
 * Sign a payload and return a token string.
 */
export function sign(payload: TokenPayload): string {
  const secret = getSecret();
  const payloadJson = JSON.stringify(payload);
  const payloadB64 = base64urlEncode(Buffer.from(payloadJson, "utf8"));

  const hmac = createHmac("sha256", secret)
    .update(payloadB64)
    .digest();
  const signatureB64 = base64urlEncode(hmac);

  return `${payloadB64}.${signatureB64}`;
}

/**
 * Verify a token and return the payload, or null if invalid.
 */
export function verify(token: string): TokenPayload | null {
  try {
    const [payloadB64, signatureB64] = token.split(".");
    if (!payloadB64 || !signatureB64) return null;

    const secret = getSecret();
    const expectedHmac = createHmac("sha256", secret)
      .update(payloadB64)
      .digest();
    const receivedHmac = base64urlDecode(signatureB64);

    // Constant-time comparison to prevent timing attacks
    if (expectedHmac.length !== receivedHmac.length) return null;
    if (!timingSafeEqual(expectedHmac, receivedHmac)) return null;

    const payloadJson = base64urlDecode(payloadB64).toString("utf8");
    const payload = JSON.parse(payloadJson) as TokenPayload;

    // Basic validation
    if (!payload.tenant_id || !payload.email) return null;

    return payload;
  } catch {
    return null;
  }
}
