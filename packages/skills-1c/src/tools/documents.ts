import type { OdataClient } from "../odata-client.js";
import type { DocumentT, DocumentsListInputT } from "../schemas.js";

/**
 * 1С:Бухгалтерия 3.0 entity sets per document type. УНФ/УТ have different
 * names — deferred to M3.
 */
const ENTITY_BY_TYPE: Record<DocumentsListInputT["type"], string> = {
  sale: "Document_РеализацияТоваровУслуг",
  purchase: "Document_ПоступлениеТоваровУслуг",
  payment_in: "Document_ПоступлениеНаРасчетныйСчет",
  payment_out: "Document_СписаниеСРасчетногоСчета",
};

interface OdataDoc {
  Ref_Key: string;
  Number: string;
  Date: string;
  СуммаДокумента?: number;
  Контрагент_Key?: string;
}

export async function documentsList(
  client: OdataClient,
  args: DocumentsListInputT,
): Promise<DocumentT[]> {
  const filter: string[] = [];
  if (args.period) {
    const [from, to] = parsePeriod(args.period);
    filter.push(`Date ge datetime'${from}'`, `Date le datetime'${to}'`);
  }
  const query: Record<string, string> = {
    $top: String(args.limit),
    $orderby: "Date desc",
  };
  if (filter.length > 0) query["$filter"] = filter.join(" and ");

  const res = await client.get<{ value: OdataDoc[] }>(
    ENTITY_BY_TYPE[args.type],
    query,
  );
  return res.value.map((d) => {
    const out: DocumentT = {
      id: d.Ref_Key,
      number: d.Number,
      date: d.Date,
      amount_rub: d.СуммаДокумента ?? 0,
    };
    if (d.Контрагент_Key) out.contractor_ref = d.Контрагент_Key;
    return out;
  });
}

/**
 * Parse a period token into ISO datetime range. Same shape as Bitrix24's
 * parsePeriod — duplicated rather than hoisted to a shared package because
 * we have only two callers; if a third copy appears, hoist into
 * `@brikko/shared-period` (M3 followup).
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
  const r = period.match(/^(\d{4}-\d{2}-\d{2})\.\.(\d{4}-\d{2}-\d{2})$/);
  if (r) return [`${r[1]}T00:00:00`, `${r[2]}T23:59:59`];
  throw new Error(`unrecognised period: ${period}`);
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}
