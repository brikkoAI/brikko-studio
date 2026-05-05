import type { OdataClient } from "../odata-client.js";
import type { BalanceLineT, ReportsBalanceInputT } from "../schemas.js";

interface OdataBalance {
  Счёт_Key: string;
  Сумма: number;
}

export async function reportsBalance(
  client: OdataClient,
  args: ReportsBalanceInputT,
): Promise<BalanceLineT[]> {
  // The 1С `/Balance` endpoint returns a current snapshot — period is
  // accepted for forward-compat (we'll switch to the Turnover() function
  // for period-bounded balance in M3) but is not yet forwarded.
  void args.period;
  const res = await client.get<{ value: OdataBalance[] }>(
    "AccountingRegister_Хозрасчетный/Balance",
  );
  return res.value.map((b) => ({
    account: b.Счёт_Key,
    amount_rub: b.Сумма,
  }));
}
