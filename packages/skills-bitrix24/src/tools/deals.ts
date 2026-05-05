import type { CrestClient } from "../rest-client.js";
import type {
  DealT,
  DealsGetInputT,
  DealsListInputT,
} from "../schemas.js";

interface BitrixDeal {
  ID: string;
  TITLE: string;
  STAGE_ID: string;
  OPPORTUNITY: string;
  DATE_CREATE: string;
  CONTACT_ID?: string;
}

export async function dealsList(
  client: CrestClient,
  args: DealsListInputT,
): Promise<DealT[]> {
  const filter: Record<string, unknown> = {};
  if (args.client) filter["%TITLE"] = args.client;
  if (args.period) {
    const [from, to] = parsePeriod(args.period);
    filter[">=DATE_CREATE"] = from;
    filter["<=DATE_CREATE"] = to;
  }
  const raw = await client.call<BitrixDeal[]>("crm.deal.list", {
    filter,
    select: ["ID", "TITLE", "STAGE_ID", "OPPORTUNITY", "DATE_CREATE", "CONTACT_ID"],
    start: 0,
  });
  return raw.slice(0, args.limit).map(toDeal);
}

export async function dealsGet(
  client: CrestClient,
  args: DealsGetInputT,
): Promise<DealT> {
  const raw = await client.call<BitrixDeal>("crm.deal.get", {
    id: args.deal_id,
  });
  return toDeal(raw);
}

function toDeal(d: BitrixDeal): DealT {
  return {
    id: d.ID,
    title: d.TITLE,
    stage: d.STAGE_ID,
    amount_rub: Number.parseFloat(d.OPPORTUNITY),
    // client_name is intentionally empty — populated via post_tool_result
    // hook by the privacy plugin's mapping store. Bitrix24 returns CONTACT_ID
    // only; resolving to a name requires a second crm.contact.get call which
    // the agent can do with bitrix24.contacts.search if needed.
    client_name: "",
    created_at: d.DATE_CREATE,
  };
}

/**
 * Parse a period token into ISO datetime range.
 * Accepts: Q1-2026, YTD, MTD, or YYYY-MM-DD..YYYY-MM-DD
 */
export function parsePeriod(period: string): [string, string] {
  const m = period.match(/^Q([1-4])-(\d{4})$/);
  if (m) {
    const q = Number(m[1]);
    const y = Number(m[2]);
    const startMonth = (q - 1) * 3 + 1;
    const endMonth = q * 3;
    const lastDay = new Date(y, endMonth, 0).getDate();
    return [
      `${y}-${pad(startMonth)}-01T00:00:00`,
      `${y}-${pad(endMonth)}-${pad(lastDay)}T23:59:59`,
    ];
  }
  if (period === "YTD") {
    const y = new Date().getFullYear();
    return [`${y}-01-01T00:00:00`, `${y}-12-31T23:59:59`];
  }
  if (period === "MTD") {
    const d = new Date();
    const y = d.getFullYear();
    const mn = d.getMonth() + 1;
    const lastDay = new Date(y, mn, 0).getDate();
    return [
      `${y}-${pad(mn)}-01T00:00:00`,
      `${y}-${pad(mn)}-${pad(lastDay)}T23:59:59`,
    ];
  }
  const range = period.match(/^(\d{4}-\d{2}-\d{2})\.\.(\d{4}-\d{2}-\d{2})$/);
  if (range) return [`${range[1]}T00:00:00`, `${range[2]}T23:59:59`];
  throw new Error(`unrecognised period: ${period}`);
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}
