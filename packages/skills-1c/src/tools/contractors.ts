import type { OdataClient } from "../odata-client.js";
import type { ContractorT, ContractorsSearchInputT } from "../schemas.js";

interface OdataContractor {
  Ref_Key: string;
  Description: string;
  ИНН?: string;
  КПП?: string;
}

export async function contractorsSearch(
  client: OdataClient,
  args: ContractorsSearchInputT,
): Promise<ContractorT[]> {
  const filters: string[] = [];
  if (args.inn) filters.push(`ИНН eq '${args.inn}'`);
  if (args.name_query) {
    filters.push(
      `substringof('${escapeOdataString(args.name_query)}', Description)`,
    );
  }
  const query: Record<string, string> = {
    $top: String(args.limit),
  };
  if (filters.length > 0) query["$filter"] = filters.join(" or ");

  const res = await client.get<{ value: OdataContractor[] }>(
    "Catalog_Контрагенты",
    query,
  );
  return res.value.map((c) => {
    const out: ContractorT = {
      id: c.Ref_Key,
      name: c.Description,
    };
    if (c.ИНН) out.inn = c.ИНН;
    if (c.КПП) out.kpp = c.КПП;
    return out;
  });
}

/** Escape single quotes in OData string literals (RFC: double the quote). */
function escapeOdataString(s: string): string {
  return s.replace(/'/g, "''");
}
