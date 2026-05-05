import type { CrestClient } from "../rest-client.js";
import type { ContactT, ContactsSearchInputT } from "../schemas.js";

interface BitrixContact {
  ID: string;
  NAME?: string;
  LAST_NAME?: string;
  PHONE?: Array<{ VALUE: string }>;
  EMAIL?: Array<{ VALUE: string }>;
}

export async function contactsSearch(
  client: CrestClient,
  args: ContactsSearchInputT,
): Promise<ContactT[]> {
  const raw = await client.call<BitrixContact[]>("crm.contact.list", {
    filter: { "%NAME": args.query },
    select: ["ID", "NAME", "LAST_NAME", "PHONE", "EMAIL"],
    start: 0,
  });
  return raw.slice(0, args.limit).map((c) => {
    const out: ContactT = {
      id: c.ID,
      name: [c.NAME, c.LAST_NAME].filter(Boolean).join(" ").trim(),
    };
    const phone = c.PHONE?.[0]?.VALUE;
    const email = c.EMAIL?.[0]?.VALUE;
    if (phone) out.phone = phone;
    if (email) out.email = email;
    return out;
  });
}
