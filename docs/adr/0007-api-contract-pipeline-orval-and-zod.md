# 7. API Contract Pipeline: OpenAPI → Orval (TanStack Query + Zod) and SignalR Contract Schemas

Date: 2026-10-16

## Status

Proposed

Amends [0004](0004-runtime-model-validation-with-zod.md)

## Context and Problem Statement

[ADR 0004](0004-runtime-model-validation-with-zod.md) states that all client DTOs are defined first as hand-written Zod schemas. [ADR 0005](0005-ai-architecture-harness-and-deterministic-guardrails.md) states that REST DTOs must never be hand-written and must be generated with Orval. These two rules contradict each other, and an AI agent will follow whichever it reads first.

There are two different contract boundaries with different tooling support:

1. **REST** — fully described by the ASP.NET Core OpenAPI document.
2. **SignalR** — not described by OpenAPI; payloads are C# records serialized to JSON.

## Decision Drivers

* Exactly one source of truth per boundary.
* Runtime validation (Zod) on every network boundary, as required by ADR 0004.
* Contract drift must fail CI, not production.

## Considered Options

1. Hand-written Zod for everything (ADR 0004 as written).
2. Orval for REST (hooks + Zod), hand-written Zod for SignalR guarded by contract tests.
3. Orval for REST + generate SignalR schemas via a custom OpenAPI component export of hub event records.

## Decision Outcome

Chosen Option: **Option 2**, with Option 3 as a later evolution.

### REST boundary

* Backend emits `openapi.json` at build time (`Microsoft.Extensions.ApiDescription.Server`) into `src/Frontend/openapi/overclock.json` (committed).
* `npm run codegen:api` runs Orval with two outputs:
  * `client: 'react-query'` → `src/Frontend/src/shared/api/generated/endpoints/`
  * `client: 'zod'` → `src/Frontend/src/shared/api/generated/zod/`
* Generated code is **never edited by hand**.

### SignalR boundary

* Hub event payloads are C# `record` types in `Overclock.Modules.<Module>.Contracts`.
* Zod schemas live in `src/Frontend/src/features/<feature>/schemas/` and are the only hand-written schemas allowed.
* A backend contract test serializes sample instances of every hub event record to `tests/contracts/signalr/*.json`; a frontend Vitest suite parses those fixtures with the corresponding Zod schema. A field rename on either side fails CI.

### Enforcement

* `verify.sh` (full mode): run `npm run codegen:api`, then `git diff --exit-code` on `openapi/` and `shared/api/generated/` → fails on stale contracts.
* PreToolUse agent hook denies edits under `shared/api/generated/`.
* ESLint `no-restricted-imports`: `axios` only allowed in `src/shared/api/**`.

## Consequences

### Positive

* ADR 0004's runtime-validation guarantee is preserved while removing the duplicated REST DTO work.
* Contract drift on both boundaries is detected deterministically.

### Negative

* Orval becomes a dev dependency; the generated folder adds diff noise in PRs.
* SignalR still needs hand-written schemas plus fixture tests until Option 3 is implemented.
