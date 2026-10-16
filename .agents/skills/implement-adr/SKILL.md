---
name: implement-adr
description: Step-by-step procedure for implementing an accepted ADR or a feature in Project Overclock without architectural drift. Use whenever the user asks to implement, wire up, or build something described in docs/adr/, or any change touching more than one file in src/.
---

# Implement an ADR (Overclock harness loop)

Follow these steps in order. Do not skip steps; do not merge steps.

## Step 0 — Gate: is the decision accepted?

1. Open `docs/adr/README.md` and the target ADR.
2. If the ADR status is **Proposed**, stop and ask the user to accept it first.
3. If the work needs a decision no ADR covers (new dependency, new protocol, moved module boundary), run
   `scripts/new-adr.sh "<title>"`, fill it in (including **Enforcement**), and stop for review.

## Step 1 — Scope isolation

- Read only: the target ADR, `AGENTS.md`, and the one relevant guideline
  (`docs/architecture/backend-guidelines.md`, `frontend-guidelines.md`, or `testing.md`).
- Write down the single module you will touch (e.g. `src/Modules/GameEngine`). Anything outside it needs a reason.

## Step 2 — Spec & diff plan (before any edit)

Present to the user:

| Section | Content |
|---|---|
| Files | add / edit / delete list |
| Boundaries | which layers (Domain / Application / Infrastructure / Host / Frontend feature) |
| Contracts | REST endpoints changed? → `npm run codegen:api`. SignalR events changed? → Zod schema + fixture |
| Persistence | EF migration needed? → `dotnet ef migrations add <Name>` |
| Tests | architecture rule(s) + integration test(s) (Testcontainers) + Vitest schema test(s) |

## Step 3 — Implement, test-first where possible

- Integration test against real Postgres/Redis first, then handler, then transport.
- Never edit: `src/Frontend/src/shared/api/generated/**`, `**/Migrations/*.cs`, harness files
  (`scripts/`, `tests/Architecture.Tests/`, `.githooks/`, hooks configs). Hooks will block or escalate these edits.

## Step 4 — Self-healing verification

```bash
bash scripts/verify.sh --fast   # inner loop, repeat until exit 0
bash scripts/verify.sh          # once before commit (needs Docker)
```

On failure: read the gate name → fix the **code** → re-run. Never weaken a test, add `[Skip]`,
add `// eslint-disable`, or use `--no-verify`. If a guardrail is genuinely wrong, propose an ADR.

## Step 5 — Atomic commit

One ADR / feature = one commit, Conventional Commits, ADR referenced in the subject:

```
feat(game-engine): implement bluff state transition (ADR 0003)
```
