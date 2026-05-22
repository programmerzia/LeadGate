import { describe, it, expect } from "vitest";
import { extractDomain, normalizeDomainPattern } from "@/lib/domain-utils";

describe("extractDomain", () => {
  it("extracts domain from a normal email", () => {
    expect(extractDomain("user@example.com")).toBe("example.com");
  });

  it("lowercases the domain", () => {
    expect(extractDomain("USER@EXAMPLE.COM")).toBe("example.com");
  });

  it("trims whitespace from the domain", () => {
    expect(extractDomain("user@  example.com  ")).toBe("example.com");
  });

  it("handles multiple @ signs (uses lastIndexOf)", () => {
    expect(extractDomain("user@company@example.com")).toBe("example.com");
  });

  it("returns null for emails without @", () => {
    expect(extractDomain("invalid-email")).toBeNull();
  });

  it("returns null for emails ending with @", () => {
    expect(extractDomain("user@")).toBeNull();
  });

  it("returns null for empty strings", () => {
    expect(extractDomain("")).toBeNull();
  });

  it("handles subdomains", () => {
    expect(extractDomain("ceo@team.startup.io")).toBe("team.startup.io");
  });
});

describe("normalizeDomainPattern", () => {
  it("lowercases and trims domain", () => {
    expect(normalizeDomainPattern("  EXAMPLE.COM  ")).toBe("example.com");
  });

  it("accepts normal domain", () => {
    expect(normalizeDomainPattern("example.com")).toBe("example.com");
  });

  it("accepts subdomain patterns", () => {
    expect(normalizeDomainPattern("mail.example.com")).toBe("mail.example.com");
  });

  it("rejects @ prefix", () => {
    expect(normalizeDomainPattern("@example.com")).toBeNull();
  });

  it("rejects patterns without a dot", () => {
    expect(normalizeDomainPattern("example")).toBeNull();
  });

  it("rejects TLD-only patterns", () => {
    expect(normalizeDomainPattern(".com")).toBeNull();
  });

  it("rejects patterns shorter than 3 chars", () => {
    expect(normalizeDomainPattern("ab")).toBeNull();
  });

  it("rejects empty or whitespace-only input", () => {
    expect(normalizeDomainPattern("")).toBeNull();
    expect(normalizeDomainPattern("   ")).toBeNull();
  });

  it("accepts shortest valid domain", () => {
    expect(normalizeDomainPattern("a.b")).toBe("a.b");
  });
});
