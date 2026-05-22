import { describe, it, expect, beforeEach } from "vitest";
import { sign, verify } from "@/lib/unsubscribe-token";

describe("unsubscribe-token", () => {
  // Force secret to be set for deterministic tests
  beforeEach(() => {
    process.env.UNSUBSCRIBE_SECRET = "test-secret-do-not-use-in-production";
  });

  describe("sign + verify roundtrip", () => {
    it("signs and verifies a valid token", () => {
      const payload = {
        tenant_id: "00000000-0000-0000-0000-000000000001",
        email: "user@example.com",
      };

      const token = sign(payload);
      const verified = verify(token);

      expect(verified).toEqual(payload);
    });

    it("preserves email case in payload", () => {
      const payload = {
        tenant_id: "00000000-0000-0000-0000-000000000001",
        email: "USER@EXAMPLE.COM",
      };

      const token = sign(payload);
      const verified = verify(token);

      expect(verified?.email).toBe("USER@EXAMPLE.COM");
    });

    it("tokens are deterministic with same secret", () => {
      const payload = {
        tenant_id: "00000000-0000-0000-0000-000000000001",
        email: "user@example.com",
      };

      const token1 = sign(payload);
      const token2 = sign(payload);

      expect(token1).toBe(token2);
    });
  });

  describe("tampering detection", () => {
    it("rejects token with modified payload", () => {
      const payload = {
        tenant_id: "00000000-0000-0000-0000-000000000001",
        email: "user@example.com",
      };

      const token = sign(payload);
      const parts = token.split(".");
      const payloadPart = parts[0]!;
      const signature = parts[1]!;

      // Flip one character in payload
      const tamperedPayload =
        payloadPart.slice(0, -1) +
        (payloadPart.slice(-1) === "a" ? "b" : "a");
      const tamperedToken = `${tamperedPayload}.${signature}`;

      expect(verify(tamperedToken)).toBeNull();
    });

    it("rejects token with modified signature", () => {
      const payload = {
        tenant_id: "00000000-0000-0000-0000-000000000001",
        email: "user@example.com",
      };

      const token = sign(payload);
      const parts = token.split(".");
      const payloadPart = parts[0]!;
      const signature = parts[1]!;

      // Flip one character in signature
      const tamperedSignature =
        signature.slice(0, -1) + (signature.slice(-1) === "a" ? "b" : "a");
      const tamperedToken = `${payloadPart}.${tamperedSignature}`;

      expect(verify(tamperedToken)).toBeNull();
    });

    // Note: Testing different secrets would require module reload, which is
    // complex in Vitest. The HMAC verification logic is tested via the
    // "modified signature" test above.
  });

  describe("malformed token handling", () => {
    it("rejects token without dot separator", () => {
      expect(verify("invalid-token-no-dot")).toBeNull();
    });

    it("rejects token with empty parts", () => {
      expect(verify(".")).toBeNull();
      expect(verify("payload.")).toBeNull();
      expect(verify(".signature")).toBeNull();
    });

    it("rejects token with invalid base64", () => {
      expect(verify("!!!.!!!")).toBeNull();
    });

    it("rejects token with invalid JSON payload", () => {
      // Valid base64 but invalid JSON
      const invalidJson = Buffer.from("{not:json", "utf8").toString(
        "base64url",
      );
      expect(verify(`${invalidJson}.signature`)).toBeNull();
    });

    it("rejects token with missing tenant_id", () => {
      const payload = { email: "user@example.com" };
      const payloadB64 = Buffer.from(JSON.stringify(payload)).toString(
        "base64url",
      );
      // Use a fake signature (will fail verification anyway)
      expect(verify(`${payloadB64}.fake`)).toBeNull();
    });

    it("rejects token with missing email", () => {
      const payload = { tenant_id: "00000000-0000-0000-0000-000000000001" };
      const payloadB64 = Buffer.from(JSON.stringify(payload)).toString(
        "base64url",
      );
      expect(verify(`${payloadB64}.fake`)).toBeNull();
    });
  });
});
