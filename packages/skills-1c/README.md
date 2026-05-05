# @brikko/skills-1c

MCP server for 1С via OData. M2 ships with **1С:Бухгалтерия 3.0**; УНФ and УТ
are deferred to M3 (different document/field names per configuration).

For full setup walkthrough see [docs/SETUP.md](./docs/SETUP.md).

## Tools

- `1c.documents.list` — list sale / purchase / payment_in / payment_out documents
- `1c.contractors.search` — search by INN or name substring
- `1c.reports.balance` — accounting balance snapshot

## Run

```sh
brikko-mcp-1c
```

The server reads credentials from the OS keychain (service `brikko-studio`,
account `1c`). Configure them via the Studio Settings UI or the helper CLI
described in SETUP.

## Privacy

Same model as `@brikko/skills-bitrix24`. The privacy plugin's `pre_tool_call`
deanonymizes args (so 1С receives a real INN to find the contractor), and
`post_tool_result` re-anonymizes the response before returning to the LLM.

## License

MIT.
