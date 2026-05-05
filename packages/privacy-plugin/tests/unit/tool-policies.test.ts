import { describe, expect, it } from "vitest";
import { resolve } from "node:path";
import { loadToolPolicies, resolvePolicy } from "../../src/tool-policies.js";

const FIXTURE = resolve(__dirname, "../fixtures/tool-policies.yaml");

describe("ToolPolicyTable", () => {
  it("loads YAML and resolves exact matches first", async () => {
    const tbl = await loadToolPolicies(FIXTURE);
    const p = resolvePolicy(tbl, "web.search");
    expect(p.kind).toBe("policy");
    if (p.kind === "policy") {
      expect(p.args).toEqual({ max_sensitivity: "low" });
      expect(p.result).toBe("anonymize");
    }
  });

  it("matches wildcard family policies", async () => {
    const tbl = await loadToolPolicies(FIXTURE);
    const p = resolvePolicy(tbl, "bitrix24.deals.list");
    expect(p.kind).toBe("policy");
    if (p.kind === "policy") {
      expect(p.args).toBe("deanonymize");
      expect(p.result).toBe("anonymize");
    }
  });

  it("returns deny verdict for blocked tool families", async () => {
    const tbl = await loadToolPolicies(FIXTURE);
    const p = resolvePolicy(tbl, "third_party_ai.send");
    expect(p.kind).toBe("deny");
    if (p.kind === "deny") {
      expect(p.message).toContain("сторонних AI");
    }
  });

  it("falls back to '*' default for unregistered tools (deny-by-default)", async () => {
    const tbl = await loadToolPolicies(FIXTURE);
    const p = resolvePolicy(tbl, "unknown_mcp.do_something");
    expect(p.kind).toBe("policy");
    if (p.kind === "policy") {
      expect(p.args).toBe("keep_anonymized");
    }
  });

  it("longer prefix wins over '*'", async () => {
    const tbl = await loadToolPolicies(FIXTURE);
    const p = resolvePolicy(tbl, "filesystem.read");
    expect(p.kind).toBe("policy");
    if (p.kind === "policy") expect(p.args).toBe("deanonymize");
  });

  it("supports per-field policies (email.send body)", async () => {
    const tbl = await loadToolPolicies(FIXTURE);
    const p = resolvePolicy(tbl, "email.send");
    expect(p.kind).toBe("policy");
    if (p.kind === "policy") {
      expect(typeof p.args).toBe("object");
      expect(
        (p.args as Record<string, { max_sensitivity: string }>)["body"]
          .max_sensitivity,
      ).toBe("low");
    }
  });

  it("returns missing-config deny when YAML doesn't exist (deny-by-default)", async () => {
    const tbl = await loadToolPolicies("/path/that/does/not/exist.yaml");
    const p = resolvePolicy(tbl, "anything");
    expect(p.kind).toBe("deny");
  });
});
