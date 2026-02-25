# Lidian CLI

Bun CLI for Lidian core REST endpoints.

## Install

```bash
npm install -g @lidian/cli
# or
bunx @lidian/cli --help
```

## Commands

```bash
lidian query --q "<term>" [--page 1] [--pageSize 1..3] [--api-key <key>] [--json]
lidian act --endpoint-id <uuid> --params '<json>' [--payment-rail prepaid_credits|x402] [--network base|ethereum] [--api-key <key>] [--json]
lidian account [--api-key <key>] [--json]
lidian login [--key ld_...] [--json]
lidian --help
```

`query` returns API matches (`items[]`) from `/v1/query` with metadata and confidence fields (`matchScore`, `matchPercent`).

## Auth

- Store key locally: `lidian login --key ld_...` (writes `~/.lidian/config.json`)
- Or run `lidian login` and paste your key after browser auth flow.
- Resolution order: `--api-key` -> `LIDIAN_API_KEY` -> `~/.lidian/config.json`.
- Optional: set `LIDIAN_API_BASE` (default `https://api.lidian.ai`).

## x402

When `--payment-rail x402` is used, CLI performs:
1. `POST /v1/payments/requirements`
2. `POST /v1/payments/verify`
3. `POST /v1/act`

## Dev

```bash
bun install
bun run typecheck
bun run lint
bun run build
```
