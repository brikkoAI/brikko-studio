import { z } from "zod";

/** Period token: Q1-2026 / YTD / MTD / YYYY-MM-DD..YYYY-MM-DD */
export const PERIOD_RE =
  /^(Q[1-4]-\d{4}|YTD|MTD|\d{4}-\d{2}-\d{2}\.\.\d{4}-\d{2}-\d{2})$/;

export const DealsListInput = z.object({
  client: z
    .string()
    .min(1)
    .optional()
    .describe("Client name or contact id; if omitted lists all"),
  period: z
    .string()
    .regex(PERIOD_RE)
    .optional()
    .describe("Period like Q1-2026, YTD, MTD, or 2026-01-01..2026-03-31"),
  limit: z.number().int().min(1).max(50).default(10),
});
export type DealsListInputT = z.infer<typeof DealsListInput>;

export const DealsGetInput = z.object({
  deal_id: z.string().min(1),
});
export type DealsGetInputT = z.infer<typeof DealsGetInput>;

export const ContactsSearchInput = z.object({
  query: z.string().min(2),
  limit: z.number().int().min(1).max(50).default(10),
});
export type ContactsSearchInputT = z.infer<typeof ContactsSearchInput>;

export const LeadsCreateInput = z.object({
  title: z.string().min(1),
  contact_name: z.string().min(1),
  contact_phone: z.string().optional(),
  contact_email: z.string().email().optional(),
  source: z.string().default("brikko_studio"),
  comments: z.string().optional(),
});
export type LeadsCreateInputT = z.infer<typeof LeadsCreateInput>;

export const Deal = z.object({
  id: z.string(),
  title: z.string(),
  stage: z.string(),
  amount_rub: z.number(),
  client_name: z.string(),
  created_at: z.string(),
});
export type DealT = z.infer<typeof Deal>;

export const Contact = z.object({
  id: z.string(),
  name: z.string(),
  phone: z.string().optional(),
  email: z.string().optional(),
});
export type ContactT = z.infer<typeof Contact>;
