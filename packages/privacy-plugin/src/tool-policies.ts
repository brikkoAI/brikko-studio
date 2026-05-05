/**
 * Tool-policy table loader (per spec §4.3).
 *
 * Loads `tool-policies.yaml` into a typed `ToolPolicyTable` with
 * deny-by-default semantics. `resolvePolicy(table, toolName)` returns the
 * matching `Verdict` using longest-prefix wildcard matching:
 *
 *   exact match (`web.search`)        > prefix length + 1000
 *   family wildcard (`bitrix24.*`)    > prefix length (excluding `.*`)
 *   bare `*`                           = 0
 *   nothing matches / file missing    → DEFAULT_DENY
 *
 * The table is loaded once at plugin startup; runtime reload requires a
 * plugin restart (per spec §11.3 — policy hot-reload is M3).
 */

import { readFile } from "node:fs/promises";
import { parse as parseYaml } from "yaml";
import { z } from "zod";

const ArgsPolicySchema = z.union([
  z.literal("deanonymize"),
  z.literal("keep_anonymized"),
  z
    .object({ max_sensitivity: z.enum(["low", "medium", "critical"]) })
    .strict(),
  z.record(
    z.string(),
    z
      .object({ max_sensitivity: z.enum(["low", "medium", "critical"]) })
      .strict(),
  ),
]);

const PolicyEntrySchema = z.union([
  z.object({
    args: ArgsPolicySchema,
    result: z.enum(["anonymize", "passthrough"]),
  }),
  z.object({
    deny: z.literal(true),
    deny_message: z.string().min(1),
  }),
]);

const TableSchema = z.object({
  tool_policies: z.record(z.string(), PolicyEntrySchema),
});

export type ArgsPolicy = z.infer<typeof ArgsPolicySchema>;
export type PolicyEntry = z.infer<typeof PolicyEntrySchema>;

export interface ToolPolicyTable {
  /** Ordered by descending pattern specificity so longest-prefix wins. */
  entries: Array<{ pattern: string; policy: PolicyEntry }>;
}

export type Verdict =
  | { kind: "policy"; args: ArgsPolicy; result: "anonymize" | "passthrough" }
  | { kind: "deny"; message: string };

const DEFAULT_DENY: Verdict = {
  kind: "deny",
  message: "No tool policy configured (deny-by-default).",
};

/**
 * Load and parse the tool-policy YAML at `path`.
 *
 * If the file is missing/unreadable, returns an empty table — every
 * subsequent `resolvePolicy()` call falls through to `DEFAULT_DENY`. This
 * is the spec-mandated deny-by-default behaviour: a misconfigured deploy
 * must never accidentally allow tool calls through.
 */
export async function loadToolPolicies(
  path: string,
): Promise<ToolPolicyTable> {
  let raw: string;
  try {
    raw = await readFile(path, "utf-8");
  } catch {
    return { entries: [] };
  }
  const parsed = TableSchema.parse(parseYaml(raw));
  const entries = Object.entries(parsed.tool_policies).map(
    ([pattern, policy]) => ({
      pattern,
      policy,
    }),
  );
  entries.sort(
    (a, b) => prefixSpecificity(b.pattern) - prefixSpecificity(a.pattern),
  );
  return { entries };
}

/**
 * Resolve the matching verdict for a fully-qualified tool name (e.g.
 * `bitrix24.deals.list`). Walks `entries` in specificity order, returning
 * the first match. Falls through to `DEFAULT_DENY` if nothing matches —
 * a YAML without a `'*'` row implicitly denies unregistered tools.
 */
export function resolvePolicy(
  table: ToolPolicyTable,
  toolName: string,
): Verdict {
  for (const entry of table.entries) {
    if (matchPattern(entry.pattern, toolName)) {
      if ("deny" in entry.policy) {
        return { kind: "deny", message: entry.policy.deny_message };
      }
      return {
        kind: "policy",
        args: entry.policy.args,
        result: entry.policy.result,
      };
    }
  }
  return DEFAULT_DENY;
}

function matchPattern(pattern: string, name: string): boolean {
  if (pattern === "*") return true;
  if (pattern.endsWith(".*")) {
    const prefix = pattern.slice(0, -2);
    return name === prefix || name.startsWith(prefix + ".");
  }
  return pattern === name;
}

function prefixSpecificity(pattern: string): number {
  // Bare `*` last; family wildcards by prefix length; exact matches dominate.
  if (pattern === "*") return 0;
  if (pattern.endsWith(".*")) return pattern.length - 2;
  return pattern.length + 1000;
}
