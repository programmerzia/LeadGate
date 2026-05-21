import { describe, it, expect } from "vitest";
import { qualifyLead } from "@/lib/qualifyLead";
import type { LeadInput } from "@/lib/types";

const baseInput: LeadInput = {
  tenant_id: "00000000-0000-0000-0000-000000000001",
  company_name: "Acme Corp",
  contact_email: null,
  org_number: null,
};

const expectExcluded = (
  email: string | null | undefined,
  reason: "missing_email" | "disposable_email",
) => {
  const result = qualifyLead({ ...baseInput, contact_email: email });
  expect(result.status).toBe("excluded");
  expect(result.exclusion_reason).toBe(reason);
  expect(result.message).toMatch(/Excluded/i);
};

const expectReady = (email: string) => {
  const result = qualifyLead({ ...baseInput, contact_email: email });
  expect(result.status).toBe("outbound_ready");
  expect(result.exclusion_reason).toBeNull();
};

describe("qualifyLead — exclusion: missing_email", () => {
  it("excludes when contact_email is undefined", () => {
    expectExcluded(undefined, "missing_email");
  });

  it("excludes when contact_email is null", () => {
    expectExcluded(null, "missing_email");
  });

  it("excludes when contact_email is empty string", () => {
    expectExcluded("", "missing_email");
  });

  it("excludes when contact_email is whitespace only", () => {
    expectExcluded("   ", "missing_email");
  });

  it("excludes on tab + newline whitespace", () => {
    expectExcluded("\t\n  ", "missing_email");
  });
});

describe("qualifyLead — exclusion: disposable_email", () => {
  it("excludes mailinator.com", () => {
    expectExcluded("user@mailinator.com", "disposable_email");
  });

  it("excludes case-insensitively (USER@MAILINATOR.COM)", () => {
    expectExcluded("USER@MAILINATOR.COM", "disposable_email");
  });

  it("excludes guerrillamail.com", () => {
    expectExcluded("foo@guerrillamail.com", "disposable_email");
  });
});

describe("qualifyLead — outbound_ready", () => {
  it("accepts a normal corporate email", () => {
    expectReady("founder@acme.no");
  });

  it("accepts emails with subdomains the user owns", () => {
    expectReady("ceo@team.startup.io");
  });

  it("does NOT substring-match — notmailinator.com is allowed", () => {
    // The skill says: match the FINAL domain segment only.
    // This guards against a naive `.includes("mailinator.com")` regression.
    expectReady("user@notmailinator.com");
  });
});

describe("qualifyLead — purity", () => {
  it("returns deeply-equal results for identical inputs", () => {
    const input: LeadInput = {
      ...baseInput,
      contact_email: "founder@acme.no",
    };
    const a = qualifyLead(input);
    const b = qualifyLead(input);
    expect(a).toEqual(b);
    // and a fresh call with a structurally-equal input
    const c = qualifyLead({ ...input });
    expect(a).toEqual(c);
  });

  it("does not mutate its input", () => {
    const input: LeadInput = {
      ...baseInput,
      contact_email: "  founder@acme.no  ",
    };
    const snapshot = JSON.stringify(input);
    qualifyLead(input);
    expect(JSON.stringify(input)).toBe(snapshot);
  });
});
