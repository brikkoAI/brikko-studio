# @brikko/skills-bitrix24

MCP server exposing Bitrix24 CRM as LLM tools for Brikko Studio.

For full setup walkthrough see [docs/SETUP.md](./docs/SETUP.md).

## Tools

- `bitrix24.deals.list` — list deals filtered by client name and/or period
- `bitrix24.deals.get` — fetch a single deal by id
- `bitrix24.contacts.search` — search contacts by name substring
- `bitrix24.leads.create` — create a new lead with title and contact details

## Run

```sh
brikko-mcp-bitrix24
```

The server reads credentials from the OS keychain (service `brikko-studio`,
account `bitrix24`). Configure them through the Studio Settings UI or the
helper CLI shipped alongside the bin (see SETUP).

## Privacy

Brikko's privacy plugin (see `@brikko/privacy-plugin`) wraps every tool call:
- `pre_tool_call` deanonymizes args before they leave the host (so Bitrix24
  receives the real client name needed to filter).
- `post_tool_result` re-anonymizes the response before it returns to the LLM,
  so the model only ever sees `<NAME_1>` placeholders, never raw PII.

## License

MIT.
