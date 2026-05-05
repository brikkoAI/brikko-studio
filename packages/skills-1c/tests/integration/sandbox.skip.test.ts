/**
 * Manual sandbox smoke tests against a real 1С installation.
 *
 * Default-skipped. To run:
 *   1. Provision a 1С test base (1С:Бухгалтерия 3.0 demo or 1cfresh.com demo).
 *   2. Enable the standard.odata HTTP service.
 *   3. Create a `brikko_studio` user with Базовые права role.
 *   4. Set BRIKKO_1C_URL=https://your-1c/InfoBase/odata/standard.odata
 *   5. Set BRIKKO_1C_USER=brikko_studio
 *   6. Set BRIKKO_1C_PASS=<password>
 *   7. Run: BRIKKO_RUN_SANDBOX=1 pnpm exec vitest run tests/integration/sandbox.skip.test.ts
 *
 * These tests hit the live 1С API. They are intentionally not part of the
 * default suite — CI must not depend on a third-party / on-prem service.
 */
import { describe, expect, it } from "vitest";
import { OdataClient } from "../../src/odata-client.js";
import {
  contractorsSearch,
  documentsList,
  reportsBalance,
} from "../../src/index.js";

const RUN = process.env["BRIKKO_RUN_SANDBOX"] === "1";
const URL_ = process.env["BRIKKO_1C_URL"];
const USER = process.env["BRIKKO_1C_USER"];
const PASS = process.env["BRIKKO_1C_PASS"];

const maybeDescribe =
  RUN && URL_ && USER && PASS ? describe : describe.skip;

maybeDescribe("1С sandbox smoke (live, Бухгалтерия 3.0)", () => {
  const client = new OdataClient({
    odataUrl: URL_!,
    username: USER!,
    password: PASS!,
  });

  it("lists sale documents from the live base", async () => {
    const out = await documentsList(client, { type: "sale", limit: 5 });
    expect(Array.isArray(out)).toBe(true);
    if (out.length > 0) {
      expect(out[0]!.id).toBeTruthy();
      expect(typeof out[0]!.amount_rub).toBe("number");
    }
  });

  it("searches contractors by partial name", async () => {
    const out = await contractorsSearch(client, {
      name_query: "ООО",
      limit: 3,
    });
    expect(Array.isArray(out)).toBe(true);
  });

  it("fetches the accounting balance snapshot", async () => {
    const out = await reportsBalance(client, { period: "YTD" });
    expect(Array.isArray(out)).toBe(true);
    if (out.length > 0) {
      expect(typeof out[0]!.account).toBe("string");
      expect(typeof out[0]!.amount_rub).toBe("number");
    }
  });
});
