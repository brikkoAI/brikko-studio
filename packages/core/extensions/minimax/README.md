# MiniMax (Brikko Studio plugin)

Bundled MiniMax plugin for both:

- API-key provider setup (`minimax`)
- Token Plan OAuth setup (`minimax-portal`)

## Enable

```bash
brikko-studio plugins enable minimax
```

Restart the Gateway after enabling.

```bash
brikko-studio gateway restart
```

## Authenticate

OAuth:

```bash
brikko-studio models auth login --provider minimax-portal --set-default
```

API key:

```bash
brikko-studio setup --wizard --auth-choice minimax-global-api
```

## Notes

- MiniMax OAuth uses a user-code login flow.
- OAuth currently targets the Token Plan path.
