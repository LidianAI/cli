# Lidian CLI

Bun CLI for Lidian core REST endpoints.

## Install

```bash
bunx @lidianai/cli --help
```

## Commands

```bash
lidian discover --q "<term>" [--page 1] [--pageSize 1..3] [--category <name>] [--auth-type none|api_key|bearer|basic|oauth2|custom] [--min-price <cents>] [--max-price <cents>] [--api-key <key>] [--env production|staging] [--api-base <url>] [--json]
lidian consume --endpoint-id <uuid> --params '<json>' [--payment-rail prepaid_credits|x402] [--network base|ethereum] [--api-key <key>] [--env production|staging] [--api-base <url>] [--json]
lidian feedback --execution-id <uuid> --rank <0..10> [--feedback "<text>"] [--api-key <key>] [--env production|staging] [--api-base <url>] [--json]
lidian account [--api-key <key>] [--env production|staging] [--api-base <url>] [--json]
lidian login [--key ld_...] [--json]
lidian --help
```

`discover` returns API matches (`items[]`) from `/v1/discover` with metadata and confidence fields (`matchScore`, `matchPercent`).

## Auth

- Store key locally: `lidian login --key ld_...` (writes `~/.lidian/config.json`)
- Or run `lidian login` and paste your key after browser auth flow.
- Resolution order: `--api-key` -> `LIDIAN_API_KEY` -> `~/.lidian/config.json`.
- API base resolution order:
  - `--api-base`
  - `LIDIAN_API_BASE`
  - `--env` (`production` or `staging`)
  - `LIDIAN_ENV` (`production` or `staging`)
  - default `https://api.lidian.ai`

## x402

When `--payment-rail x402` is used, CLI performs:
1. `POST /v1/payments/requirements`
2. `POST /v1/payments/verify`
3. `POST /v1/consume` (returns `executionId`)

Submit feedback later:
4. `POST /v1/consume/feedback` with `executionId`, `rank`, optional `feedback`

Default payment rail behavior when `--payment-rail` is omitted:
- with API key/token: `prepaid_credits`
- without auth: `x402`

## Dev

```bash
bun install
bun run typecheck
bun run lint
bun run build
```
