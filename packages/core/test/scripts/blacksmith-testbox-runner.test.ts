import { EventEmitter } from "node:events";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildBlacksmithRunArgs,
  resolveTestboxSyncTimeoutMs,
  runBlacksmithTestboxRunner,
  splitRunnerArgs,
} from "../../scripts/blacksmith-testbox-runner.mjs";

describe("blacksmith testbox runner", () => {
  it("splits runner args from the remote command", () => {
    expect(
      splitRunnerArgs(["--id", "tbx_abc123", "--", "BRIKKO_STUDIO_TESTBOX=1", "pnpm", "check:changed"]),
    ).toEqual({
      runnerArgs: ["--id", "tbx_abc123"],
      commandArgs: ["BRIKKO_STUDIO_TESTBOX=1", "pnpm", "check:changed"],
    });
  });

  it("builds blacksmith run arguments", () => {
    expect(
      buildBlacksmithRunArgs({
        commandArgs: ["BRIKKO_STUDIO_TESTBOX=1", "pnpm", "check:changed"],
        testboxId: "tbx_abc123",
      }),
    ).toEqual(["testbox", "run", "--id", "tbx_abc123", "BRIKKO_STUDIO_TESTBOX=1 pnpm check:changed"]);
  });

  it("refuses to run a remote-visible id without a local private key", async () => {
    let spawned = false;
    const stderr = { write: (value: string) => value.length };
    const code = await runBlacksmithTestboxRunner({
      argv: ["--id", "tbx_01kqap50t9fqggzw1akg5dtmmq", "--", "pnpm", "check:changed"],
      env: { BRIKKO_STUDIO_BLACKSMITH_TESTBOX_STATE_DIR: "/state/testboxes" },
      spawn: () => {
        spawned = true;
        return { status: 0 };
      },
      stderr,
    });

    expect(code).toBe(2);
    expect(spawned).toBe(false);
  });

  it("refuses to run a keyed id that was not claimed by this checkout", async () => {
    const stateDir = fs.mkdtempSync(path.join(os.tmpdir(), "brikko-studio-testbox-runner-"));
    const testboxDir = path.join(stateDir, "tbx_01kqap50t9fqggzw1akg5dtmmq");
    fs.mkdirSync(testboxDir, { recursive: true });
    fs.writeFileSync(path.join(testboxDir, "id_ed25519"), "test-key\n");

    let spawned = false;
    let stderrText = "";
    const code = await runBlacksmithTestboxRunner({
      argv: ["--id", "tbx_01kqap50t9fqggzw1akg5dtmmq", "--", "pnpm", "check:changed"],
      env: { ...process.env, BRIKKO_STUDIO_BLACKSMITH_TESTBOX_STATE_DIR: stateDir },
      spawn: () => {
        spawned = true;
        return { status: 0 };
      },
      stderr: { write: (value: string) => (stderrText += value) },
    });

    expect(code).toBe(2);
    expect(spawned).toBe(false);
    expect(stderrText).toContain("BrikkoStudio Testbox claim missing");
  });

  it("claims a keyed id without spawning when no remote command is supplied", async () => {
    const stateDir = fs.mkdtempSync(path.join(os.tmpdir(), "brikko-studio-testbox-runner-"));
    const testboxDir = path.join(stateDir, "tbx_01kqap50t9fqggzw1akg5dtmmq");
    const claimPath = path.join(testboxDir, "brikko-studio-runner.json");
    fs.mkdirSync(testboxDir, { recursive: true });
    fs.writeFileSync(path.join(testboxDir, "id_ed25519"), "test-key\n");

    let spawned = false;
    let stdoutText = "";
    const code = await runBlacksmithTestboxRunner({
      argv: ["--claim", "--id", "tbx_01kqap50t9fqggzw1akg5dtmmq"],
      env: { ...process.env, BRIKKO_STUDIO_BLACKSMITH_TESTBOX_STATE_DIR: stateDir },
      spawn: () => {
        spawned = true;
        return { status: 0 };
      },
      stdout: { write: (value: string) => (stdoutText += value) },
    });

    expect(code).toBe(0);
    expect(spawned).toBe(false);
    expect(stdoutText).toContain("BrikkoStudio Testbox claim written");
    expect(JSON.parse(fs.readFileSync(claimPath, "utf8")).repoRoot).toBe(process.cwd());
  });

  it("defaults the Testbox sync timeout and accepts disable override", () => {
    expect(resolveTestboxSyncTimeoutMs({})).toBe(300000);
    expect(resolveTestboxSyncTimeoutMs({ BRIKKO_STUDIO_TESTBOX_SYNC_TIMEOUT_MS: "0" })).toBe(0);
    expect(resolveTestboxSyncTimeoutMs({ BRIKKO_STUDIO_TESTBOX_SYNC_TIMEOUT_MS: "2500" })).toBe(2500);
  });

  it("terminates a Testbox run that stalls in sync", async () => {
    const stateDir = fs.mkdtempSync(path.join(os.tmpdir(), "brikko-studio-testbox-runner-"));
    const testboxId = "tbx_01kqap50t9fqggzw1akg5dtmmq";
    const testboxDir = path.join(stateDir, testboxId);
    fs.mkdirSync(testboxDir, { recursive: true });
    fs.writeFileSync(path.join(testboxDir, "id_ed25519"), "test-key\n");
    await runBlacksmithTestboxRunner({
      argv: ["--claim", "--id", testboxId],
      env: { ...process.env, BRIKKO_STUDIO_BLACKSMITH_TESTBOX_STATE_DIR: stateDir },
      stdout: { write: () => 0 },
    });

    let killed = false;
    let stderrText = "";
    const fakeSpawn = () => {
      const child = new EventEmitter() as EventEmitter & {
        stdout: EventEmitter;
        stderr: EventEmitter;
        kill: () => void;
      };
      child.stdout = new EventEmitter();
      child.stderr = new EventEmitter();
      child.kill = () => {
        killed = true;
        child.emit("close", 143);
      };
      queueMicrotask(() => child.stdout.emit("data", "Syncing... (still in progress)"));
      return child;
    };

    const code = await runBlacksmithTestboxRunner({
      argv: ["--id", testboxId, "--", "pnpm", "check:changed"],
      env: {
        ...process.env,
        BRIKKO_STUDIO_BLACKSMITH_TESTBOX_STATE_DIR: stateDir,
        BRIKKO_STUDIO_TESTBOX_SYNC_TIMEOUT_MS: "1",
      },
      spawn: fakeSpawn,
      stderr: { write: (value: string) => (stderrText += value) },
      stdout: { write: () => 0 },
    });

    expect(code).toBe(124);
    expect(killed).toBe(true);
    expect(stderrText).toContain("Blacksmith Testbox sync produced no post-sync output");
  });
});
