# AGENTS.md - Lidian CLI

Guidelines for agents working in the `cli/` package.

## Core Standards

- Keep implementations simple, clean, and easy to read.
- Prefer direct logic over clever abstractions and indirection.
- Avoid obscure decisions and surprising behavior.

## Required Simplification Pass

After any feature or code change, always review your own diff and simplify before finishing:

- remove dead code and temporary scaffolding
- collapse duplicated logic
- simplify branching/flow where possible
- improve naming for clarity

If complexity is unavoidable, add a short comment explaining why it is necessary.

## Tooling Rules

- Use `bun`/`bunx` only.
- Run `bun run lint` and `bun run typecheck` before completion.
- Use explicit types and avoid `any`.
