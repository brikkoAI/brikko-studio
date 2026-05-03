import { describe, expect, it } from "vitest";
import {
  buildParseArgv,
  getFlagValue,
  getCommandPath,
  getCommandPositionalsWithRootOptions,
  getCommandPathWithRootOptions,
  getPrimaryCommand,
  getPositiveIntFlagValue,
  getVerboseFlag,
  hasHelpOrVersion,
  hasFlag,
  isHelpOrVersionInvocation,
  isRootHelpInvocation,
  isRootVersionInvocation,
  shouldMigrateState,
  shouldMigrateStateFromPath,
} from "./argv.js";

describe("argv helpers", () => {
  it.each([
    {
      name: "help flag",
      argv: ["node", "brikko-studio", "--help"],
      expected: true,
    },
    {
      name: "version flag",
      argv: ["node", "brikko-studio", "-V"],
      expected: true,
    },
    {
      name: "normal command",
      argv: ["node", "brikko-studio", "status"],
      expected: false,
    },
    {
      name: "root -v alias",
      argv: ["node", "brikko-studio", "-v"],
      expected: true,
    },
    {
      name: "root -v alias with profile",
      argv: ["node", "brikko-studio", "--profile", "work", "-v"],
      expected: true,
    },
    {
      name: "root -v alias with log-level",
      argv: ["node", "brikko-studio", "--log-level", "debug", "-v"],
      expected: true,
    },
    {
      name: "subcommand -v should not be treated as version",
      argv: ["node", "brikko-studio", "acp", "-v"],
      expected: false,
    },
    {
      name: "root -v alias with equals profile",
      argv: ["node", "brikko-studio", "--profile=work", "-v"],
      expected: true,
    },
    {
      name: "subcommand path after global root flags should not be treated as version",
      argv: ["node", "brikko-studio", "--dev", "skills", "list", "-v"],
      expected: false,
    },
  ])("detects help/version flags: $name", ({ argv, expected }) => {
    expect(hasHelpOrVersion(argv)).toBe(expected);
  });

  it.each([
    {
      name: "root help command",
      argv: ["node", "brikko-studio", "help"],
      expected: true,
    },
    {
      name: "root help command with target",
      argv: ["node", "brikko-studio", "help", "matrix"],
      expected: true,
    },
    {
      name: "nested help command",
      argv: ["node", "brikko-studio", "matrix", "encryption", "help"],
      expected: true,
    },
    {
      name: "known subcommand root help command",
      argv: ["node", "brikko-studio", "config", "help"],
      expected: true,
    },
    {
      name: "known leaf command positional help",
      argv: ["node", "brikko-studio", "docs", "help"],
      expected: false,
    },
    {
      name: "known subcommand leaf positional help",
      argv: ["node", "brikko-studio", "config", "set", "some.path", "help"],
      expected: false,
    },
    {
      name: "unknown plugin command help",
      argv: ["node", "brikko-studio", "external-plugin", "tools", "help"],
      expected: true,
    },
    {
      name: "help flag",
      argv: ["node", "brikko-studio", "matrix", "encryption", "--help"],
      expected: true,
    },
    {
      name: "help as option value",
      argv: ["node", "brikko-studio", "agent", "--message", "help"],
      expected: false,
    },
    {
      name: "help after terminator",
      argv: ["node", "brikko-studio", "nodes", "invoke", "--", "help"],
      expected: false,
    },
    {
      name: "help flag after terminator",
      argv: ["node", "brikko-studio", "nodes", "invoke", "--", "--help"],
      expected: false,
    },
    {
      name: "version flag after terminator",
      argv: ["node", "brikko-studio", "nodes", "invoke", "--", "--version"],
      expected: false,
    },
  ])("detects help/version invocations: $name", ({ argv, expected }) => {
    expect(isHelpOrVersionInvocation(argv)).toBe(expected);
  });

  it.each([
    {
      name: "root --version",
      argv: ["node", "brikko-studio", "--version"],
      expected: true,
    },
    {
      name: "root -V",
      argv: ["node", "brikko-studio", "-V"],
      expected: true,
    },
    {
      name: "root -v alias with profile",
      argv: ["node", "brikko-studio", "--profile", "work", "-v"],
      expected: true,
    },
    {
      name: "subcommand version flag",
      argv: ["node", "brikko-studio", "status", "--version"],
      expected: false,
    },
    {
      name: "unknown root flag with version",
      argv: ["node", "brikko-studio", "--unknown", "--version"],
      expected: false,
    },
  ])("detects root-only version invocations: $name", ({ argv, expected }) => {
    expect(isRootVersionInvocation(argv)).toBe(expected);
  });

  it.each([
    {
      name: "root --help",
      argv: ["node", "brikko-studio", "--help"],
      expected: true,
    },
    {
      name: "root -h",
      argv: ["node", "brikko-studio", "-h"],
      expected: true,
    },
    {
      name: "root --help with profile",
      argv: ["node", "brikko-studio", "--profile", "work", "--help"],
      expected: true,
    },
    {
      name: "subcommand --help",
      argv: ["node", "brikko-studio", "status", "--help"],
      expected: false,
    },
    {
      name: "help before subcommand token",
      argv: ["node", "brikko-studio", "--help", "status"],
      expected: false,
    },
    {
      name: "help after -- terminator",
      argv: ["node", "brikko-studio", "nodes", "invoke", "--", "device.status", "--help"],
      expected: false,
    },
    {
      name: "unknown root flag before help",
      argv: ["node", "brikko-studio", "--unknown", "--help"],
      expected: false,
    },
    {
      name: "unknown root flag after help",
      argv: ["node", "brikko-studio", "--help", "--unknown"],
      expected: false,
    },
  ])("detects root-only help invocations: $name", ({ argv, expected }) => {
    expect(isRootHelpInvocation(argv)).toBe(expected);
  });

  it.each([
    {
      name: "single command with trailing flag",
      argv: ["node", "brikko-studio", "status", "--json"],
      expected: ["status"],
    },
    {
      name: "two-part command",
      argv: ["node", "brikko-studio", "agents", "list"],
      expected: ["agents", "list"],
    },
    {
      name: "terminator cuts parsing",
      argv: ["node", "brikko-studio", "status", "--", "ignored"],
      expected: ["status"],
    },
  ])("extracts command path: $name", ({ argv, expected }) => {
    expect(getCommandPath(argv, 2)).toEqual(expected);
  });

  it("extracts command path while skipping known root option values", () => {
    expect(
      getCommandPathWithRootOptions(
        [
          "node",
          "brikko-studio",
          "--profile",
          "work",
          "--container",
          "demo",
          "--no-color",
          "config",
          "validate",
        ],
        2,
      ),
    ).toEqual(["config", "validate"]);
  });

  it("extracts routed config get positionals with interleaved root options", () => {
    expect(
      getCommandPositionalsWithRootOptions(
        ["node", "brikko-studio", "config", "get", "--log-level", "debug", "update.channel", "--json"],
        {
          commandPath: ["config", "get"],
          booleanFlags: ["--json"],
        },
      ),
    ).toEqual(["update.channel"]);
  });

  it("extracts routed config unset positionals with interleaved root options", () => {
    expect(
      getCommandPositionalsWithRootOptions(
        ["node", "brikko-studio", "config", "unset", "--profile", "work", "update.channel"],
        {
          commandPath: ["config", "unset"],
        },
      ),
    ).toEqual(["update.channel"]);
  });

  it("returns null when routed command sees unknown options", () => {
    expect(
      getCommandPositionalsWithRootOptions(
        ["node", "brikko-studio", "config", "get", "--mystery", "value", "update.channel"],
        {
          commandPath: ["config", "get"],
          booleanFlags: ["--json"],
        },
      ),
    ).toBeNull();
  });

  it.each([
    {
      name: "returns first command token",
      argv: ["node", "brikko-studio", "agents", "list"],
      expected: "agents",
    },
    {
      name: "returns null when no command exists",
      argv: ["node", "brikko-studio"],
      expected: null,
    },
    {
      name: "skips known root option values",
      argv: ["node", "brikko-studio", "--log-level", "debug", "status"],
      expected: "status",
    },
  ])("returns primary command: $name", ({ argv, expected }) => {
    expect(getPrimaryCommand(argv)).toBe(expected);
  });

  it.each([
    {
      name: "detects flag before terminator",
      argv: ["node", "brikko-studio", "status", "--json"],
      flag: "--json",
      expected: true,
    },
    {
      name: "ignores flag after terminator",
      argv: ["node", "brikko-studio", "--", "--json"],
      flag: "--json",
      expected: false,
    },
  ])("parses boolean flags: $name", ({ argv, flag, expected }) => {
    expect(hasFlag(argv, flag)).toBe(expected);
  });

  it.each([
    {
      name: "value in next token",
      argv: ["node", "brikko-studio", "status", "--timeout", "5000"],
      expected: "5000",
    },
    {
      name: "value in equals form",
      argv: ["node", "brikko-studio", "status", "--timeout=2500"],
      expected: "2500",
    },
    {
      name: "missing value",
      argv: ["node", "brikko-studio", "status", "--timeout"],
      expected: null,
    },
    {
      name: "next token is another flag",
      argv: ["node", "brikko-studio", "status", "--timeout", "--json"],
      expected: null,
    },
    {
      name: "flag appears after terminator",
      argv: ["node", "brikko-studio", "--", "--timeout=99"],
      expected: undefined,
    },
  ])("extracts flag values: $name", ({ argv, expected }) => {
    expect(getFlagValue(argv, "--timeout")).toBe(expected);
  });

  it("parses verbose flags", () => {
    expect(getVerboseFlag(["node", "brikko-studio", "status", "--verbose"])).toBe(true);
    expect(getVerboseFlag(["node", "brikko-studio", "status", "--debug"])).toBe(false);
    expect(getVerboseFlag(["node", "brikko-studio", "status", "--debug"], { includeDebug: true })).toBe(
      true,
    );
  });

  it.each([
    {
      name: "missing flag",
      argv: ["node", "brikko-studio", "status"],
      expected: undefined,
    },
    {
      name: "missing value",
      argv: ["node", "brikko-studio", "status", "--timeout"],
      expected: null,
    },
    {
      name: "valid positive integer",
      argv: ["node", "brikko-studio", "status", "--timeout", "5000"],
      expected: 5000,
    },
    {
      name: "invalid integer",
      argv: ["node", "brikko-studio", "status", "--timeout", "nope"],
      expected: undefined,
    },
  ])("parses positive integer flag values: $name", ({ argv, expected }) => {
    expect(getPositiveIntFlagValue(argv, "--timeout")).toBe(expected);
  });

  it.each([
    {
      name: "keeps plain node argv",
      rawArgs: ["node", "brikko-studio", "status"],
      expected: ["node", "brikko-studio", "status"],
    },
    {
      name: "keeps version-suffixed node binary",
      rawArgs: ["node-22", "brikko-studio", "status"],
      expected: ["node-22", "brikko-studio", "status"],
    },
    {
      name: "keeps windows versioned node exe",
      rawArgs: ["node-22.2.0.exe", "brikko-studio", "status"],
      expected: ["node-22.2.0.exe", "brikko-studio", "status"],
    },
    {
      name: "keeps dotted node binary",
      rawArgs: ["node-22.2", "brikko-studio", "status"],
      expected: ["node-22.2", "brikko-studio", "status"],
    },
    {
      name: "keeps dotted node exe",
      rawArgs: ["node-22.2.exe", "brikko-studio", "status"],
      expected: ["node-22.2.exe", "brikko-studio", "status"],
    },
    {
      name: "keeps absolute versioned node path",
      rawArgs: ["/usr/bin/node-22.2.0", "brikko-studio", "status"],
      expected: ["/usr/bin/node-22.2.0", "brikko-studio", "status"],
    },
    {
      name: "keeps node24 shorthand",
      rawArgs: ["node24", "brikko-studio", "status"],
      expected: ["node24", "brikko-studio", "status"],
    },
    {
      name: "keeps absolute node24 shorthand",
      rawArgs: ["/usr/bin/node24", "brikko-studio", "status"],
      expected: ["/usr/bin/node24", "brikko-studio", "status"],
    },
    {
      name: "keeps windows node24 exe",
      rawArgs: ["node24.exe", "brikko-studio", "status"],
      expected: ["node24.exe", "brikko-studio", "status"],
    },
    {
      name: "keeps nodejs binary",
      rawArgs: ["nodejs", "brikko-studio", "status"],
      expected: ["nodejs", "brikko-studio", "status"],
    },
    {
      name: "prefixes fallback when first arg is not a node launcher",
      rawArgs: ["node-dev", "brikko-studio", "status"],
      expected: ["node", "brikko-studio", "node-dev", "brikko-studio", "status"],
    },
    {
      name: "prefixes fallback when raw args start at program name",
      rawArgs: ["brikko-studio", "status"],
      expected: ["node", "brikko-studio", "status"],
    },
    {
      name: "keeps bun execution argv",
      rawArgs: ["bun", "src/entry.ts", "status"],
      expected: ["bun", "src/entry.ts", "status"],
    },
  ] as const)("builds parse argv from raw args: $name", ({ rawArgs, expected }) => {
    const parsed = buildParseArgv({
      programName: "brikko-studio",
      rawArgs: [...rawArgs],
    });
    expect(parsed).toEqual([...expected]);
  });

  it("builds parse argv from fallback args", () => {
    const fallbackArgv = buildParseArgv({
      programName: "brikko-studio",
      fallbackArgv: ["status"],
    });
    expect(fallbackArgv).toEqual(["node", "brikko-studio", "status"]);
  });

  it.each([
    { argv: ["node", "brikko-studio", "status"], expected: false },
    { argv: ["node", "brikko-studio", "health"], expected: false },
    { argv: ["node", "brikko-studio", "sessions"], expected: false },
    { argv: ["node", "brikko-studio", "config", "get", "update"], expected: false },
    { argv: ["node", "brikko-studio", "config", "unset", "update"], expected: false },
    { argv: ["node", "brikko-studio", "models", "list"], expected: false },
    { argv: ["node", "brikko-studio", "models", "status"], expected: false },
    { argv: ["node", "brikko-studio", "update", "status", "--json"], expected: false },
    { argv: ["node", "brikko-studio", "agent", "--message", "hi"], expected: false },
    { argv: ["node", "brikko-studio", "agents", "list"], expected: true },
    { argv: ["node", "brikko-studio", "message", "send"], expected: true },
  ] as const)("decides when to migrate state: $argv", ({ argv, expected }) => {
    expect(shouldMigrateState([...argv])).toBe(expected);
  });

  it.each([
    { path: ["status"], expected: false },
    { path: ["update", "status"], expected: false },
    { path: ["config", "get"], expected: false },
    { path: ["models", "status"], expected: false },
    { path: ["agents", "list"], expected: true },
  ])("reuses command path for migrate state decisions: $path", ({ path, expected }) => {
    expect(shouldMigrateStateFromPath(path)).toBe(expected);
  });
});
