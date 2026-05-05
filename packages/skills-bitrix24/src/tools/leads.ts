import type { CrestClient } from "../rest-client.js";
import type { LeadsCreateInputT } from "../schemas.js";

export async function leadsCreate(
  client: CrestClient,
  args: LeadsCreateInputT,
): Promise<{ id: string }> {
  const fields: Record<string, unknown> = {
    TITLE: args.title,
    NAME: args.contact_name,
    SOURCE_ID: args.source,
  };
  if (args.contact_phone) {
    fields["PHONE"] = [{ VALUE: args.contact_phone, VALUE_TYPE: "WORK" }];
  }
  if (args.contact_email) {
    fields["EMAIL"] = [{ VALUE: args.contact_email, VALUE_TYPE: "WORK" }];
  }
  if (args.comments) fields["COMMENTS"] = args.comments;

  const id = await client.call<number | string>("crm.lead.add", { fields });
  return { id: String(id) };
}
