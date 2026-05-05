/**
 * Manual sandbox smoke tests against a real Bitrix24 portal.
 *
 * Default-skipped. To run:
 *   1. Provision a sandbox at https://www.bitrix24.ru/create.php
 *   2. Create one test deal and one test contact.
 *   3. Set BRIKKO_BITRIX24_PORTAL=https://acme-test.bitrix24.ru
 *   4. Set BRIKKO_BITRIX24_TOKEN=1/abc...
 *   5. Run: BRIKKO_RUN_SANDBOX=1 pnpm exec vitest run tests/integration/sandbox.skip.test.ts
 *
 * These tests hit the live Bitrix24 API. They are intentionally not part of
 * the default suite — CI must not depend on a third-party service.
 */
import { describe, expect, it } from "vitest";
import { CrestClient } from "../../src/rest-client.js";
import {
  contactsSearch,
  dealsGet,
  dealsList,
  leadsCreate,
} from "../../src/index.js";

const RUN = process.env["BRIKKO_RUN_SANDBOX"] === "1";
const PORTAL = process.env["BRIKKO_BITRIX24_PORTAL"];
const TOKEN = process.env["BRIKKO_BITRIX24_TOKEN"];

const maybeDescribe = RUN && PORTAL && TOKEN ? describe : describe.skip;

maybeDescribe("Bitrix24 sandbox smoke (live)", () => {
  const client = new CrestClient({
    portalUrl: PORTAL!,
    webhookToken: TOKEN!,
  });

  it("lists deals from the live portal", async () => {
    const out = await dealsList(client, { limit: 5 });
    expect(Array.isArray(out)).toBe(true);
    if (out.length > 0) {
      expect(out[0]!.id).toMatch(/^\d+$/);
    }
  });

  it("fetches a single deal by id (uses first deal from list)", async () => {
    const list = await dealsList(client, { limit: 1 });
    if (list.length === 0) return; // empty sandbox — nothing to fetch
    const out = await dealsGet(client, { deal_id: list[0]!.id });
    expect(out.id).toBe(list[0]!.id);
  });

  it("searches contacts", async () => {
    const out = await contactsSearch(client, { query: "test", limit: 3 });
    expect(Array.isArray(out)).toBe(true);
  });

  it("creates a lead and returns id", async () => {
    const out = await leadsCreate(client, {
      title: `Brikko sandbox test ${new Date().toISOString()}`,
      contact_name: "Brikko Test",
      contact_phone: "+7 999 000 00 00",
      source: "brikko_studio",
      comments: "Created by Brikko sandbox.skip.test.ts — safe to delete.",
    });
    expect(out.id).toMatch(/^\d+$/);
  });
});
