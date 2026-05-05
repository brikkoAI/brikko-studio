import { z } from "zod";

export const PERIOD_RE =
  /^(Q[1-4]-\d{4}|YTD|MTD|\d{4}-\d{2}-\d{2}\.\.\d{4}-\d{2}-\d{2})$/;

export const DocumentsListInput = z.object({
  type: z
    .enum(["sale", "purchase", "payment_in", "payment_out"])
    .default("sale"),
  period: z.string().regex(PERIOD_RE).optional(),
  limit: z.number().int().min(1).max(50).default(10),
});
export type DocumentsListInputT = z.infer<typeof DocumentsListInput>;

export const ContractorsSearchInput = z
  .object({
    inn: z.string().regex(/^\d{10}$|^\d{12}$/).optional(),
    name_query: z.string().min(2).optional(),
    limit: z.number().int().min(1).max(50).default(10),
  })
  .refine((v) => v.inn || v.name_query, {
    message: "either inn or name_query is required",
  });
export type ContractorsSearchInputT = z.infer<typeof ContractorsSearchInput>;

export const ReportsBalanceInput = z.object({
  period: z.string().regex(PERIOD_RE).default("YTD"),
});
export type ReportsBalanceInputT = z.infer<typeof ReportsBalanceInput>;

export const Document = z.object({
  id: z.string(),
  number: z.string(),
  date: z.string(),
  amount_rub: z.number(),
  contractor_ref: z.string().optional(),
});
export type DocumentT = z.infer<typeof Document>;

export const Contractor = z.object({
  id: z.string(),
  name: z.string(),
  inn: z.string().optional(),
  kpp: z.string().optional(),
});
export type ContractorT = z.infer<typeof Contractor>;

export const BalanceLine = z.object({
  account: z.string(),
  amount_rub: z.number(),
});
export type BalanceLineT = z.infer<typeof BalanceLine>;
