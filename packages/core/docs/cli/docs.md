---
summary: "CLI reference for `brikko-studio docs` (search the live docs index)"
read_when:
  - You want to search the live Brikko Studio docs from the terminal
title: "Docs"
---

# `brikko-studio docs`

Search the live docs index.

Arguments:

- `[query...]`: search terms to send to the live docs index

Examples:

```bash
brikko-studio docs
brikko-studio docs browser existing-session
brikko-studio docs sandbox allowHostControl
brikko-studio docs gateway token secretref
```

Notes:

- With no query, `brikko-studio docs` opens the live docs search entrypoint.
- Multi-word queries are passed through as one search request.

## Related

- [CLI reference](/cli)
