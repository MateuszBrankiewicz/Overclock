# AGENTS.md — Development Guardrails & Architecture Harness
# Project: Overclock (Dead Circuit)

You are an expert software engineer pair-programming on **Project: Overclock** (*Dead Circuit*).
Your primary directive is to preserve architectural integrity and prevent drift across iterations.
Do not take shortcuts. Code that violates these guardrails is rejected by tests, hooks, and CI — see §5.

---

## 0. Source-of-Truth Order

When two documents disagree, the higher one wins — and you must report the conflict instead of silently picking one:

1. **Accepted** ADRs in [`docs/adr/`](docs/adr/README.md) (newest supersedes older).
2. This file (`AGENTS.md`).
3. Guidelines in [`docs/architecture/`](docs/architecture/).
4. Existing code.

**Proposed** ADRs are drafts: do not implement code that depends on them until a human marks them **Accepted**.

---

## 1. ADR-First Principle (Architecture Decision Records)

1. **Before writing code for any new feature or architectural refactor**, consult [`docs/adr/README.md`](docs/adr/README.md).
2. If the intended solution:
   - Introduces a new third-party dependency,
   - Modifies communication protocols (SignalR, REST, Redis channels),
   - Shifts domain boundaries or module responsibilities,
   **PAUSE WORK IMMEDIATELY** and draft a new ADR with `scripts/new-adr.sh "<title>"` (MADR format, status `Proposed`, including an **Enforcement** section).
3. Agents never set an ADR to `Accepted` and never rewrite an accepted ADR — supersede it with a new one.
4. For an end-to-end procedure use the **`implement-adr`** skill ([`.agents/skills/implement-adr/SKILL.md`](.agents/skills/implement-adr/SKILL.md)).
5. Detailed standards (read only the one you need):
   - Backend: [`docs/architecture/backend-guidelines.md`](docs/architecture/backend-guidelines.md)
   - Frontend: [`docs/architecture/frontend-guidelines.md`](docs/architecture/frontend-guidelines.md)
   - Testing & verification: [`docs/architecture/testing.md`](docs/architecture/testing.md)

---

## 2. Repository Map

| Path | Purpose |
|---|---|
| `backend/src/Host/` | ASP.NET Core host: REST endpoints, SignalR hubs, DI composition root |
| `backend/src/Modules/<Module>/{Domain,Application,Infrastructure,Contracts}` | Isolated modules: `GameEngine`, `Identity`, `Economy`, `Stats` |
| `backend/src/SharedKernel/` | Result type, base entity, domain event abstractions |
| `backend/tests/Architecture.Tests/` | NetArchTest boundary rules (**protected**) |
| `backend/tests/Integration.Tests/` | WebApplicationFactory + Testcontainers (Postgres, Redis) |
| `frontend/` | React 19 + Vite app; `frontend/src/shared/api/generated/` is **generated** |
| `tests/contracts/signalr/` | Shared JSON contract fixtures for SignalR payload verification |
| `docs/adr/`, `docs/architecture/`, `docs/business/` | Decisions, technical standards, game rules |
| `scripts/` | Harness: `verify.sh`, `check-docs.sh`, `new-adr.sh`, agent hooks (**protected**) |

---

## 3. Hard Negative Constraints

### Backend (.NET 10 Modular Monolith & CQRS)
* ❌ **NO direct SQL queries or `DbContext` injections in API Controllers or SignalR Hubs.** Presentation layers only adapt network transport and dispatch requests via Mediator (`ISender.Send`).
* ❌ **NO business logic outside CQRS Command/Query Handlers or Domain Entities.**
* ❌ **ZERO `IQueryable` leaks beyond the infrastructure layer.** Materialize queries via `.ToListAsync()` or `.FirstOrDefaultAsync()` inside repositories.
* ❌ **ZERO `throw new Exception(...)` for domain or validation errors.** Return `Result<T>` or `Result` (library: see [ADR 0006](docs/adr/0006-functional-error-handling-with-ardalis-result.md)). Exceptions are exclusively reserved for unrecoverable infrastructure crashes (500).
* ❌ **NO direct cross-module project dependencies.** Modules communicate solely through `SharedKernel`, a module's `Contracts` project, or in-process domain events.
* ❌ **NO mutation of game room state outside the room's single-writer loop** ([ADR 0003](docs/adr/0003-realtime-engine-signalr-and-state-machine.md)).

### PostgreSQL & Entity Framework Core
* ❌ **NEVER modify the database schema manually or use `EnsureCreated()`.** Migrations must be generated via `dotnet ef migrations add <Name>` and never hand-edited.
* ❌ **NEVER query without `.AsNoTracking()`** in read-only queries (CQRS Query Handlers).
* ❌ **NO shared `DbContext` across modules.** One `DbContext` and one PostgreSQL schema per module.
* ❌ **NO distributed transactions.** Use local transactions per module or the Outbox pattern.

### Redis & Caching
* ❌ **NEVER store items in Redis without an explicit TTL.** Use `DistributedCacheEntryOptions` with `AbsoluteExpirationRelativeToNow`.
* ❌ **Redis keys MUST adhere to the hierarchical namespace:** `overclock:{module}:{entity}:{id}` (e.g., `overclock:game:room:CYBER-7X9`, `overclock:game:lock:CYBER-7X9`).
* ❌ **Graceful Cache Misses:** A missing cache entry must never crash the service or produce a 500 error; fall back safely to persistence or return a domain `NotFound`.

### Frontend (React 19 + TypeScript + Vite)
* ❌ **NEVER write manual TypeScript DTO interfaces or Zod schemas for REST endpoints.** Hooks and REST Zod schemas are generated via `npm run codegen:api` (Orval, [ADR 0007](docs/adr/0007-api-contract-pipeline-orval-and-zod.md)).
* ❌ **NO raw `fetch()` or `axios` calls in React components.** Use auto-generated TanStack Query hooks.
* ❌ **NEVER cast untrusted WebSocket data with `as EventType`.** All incoming SignalR event payloads must be validated at runtime via **Zod** (`safeParse`) as dictated by [ADR 0004](docs/adr/0004-runtime-model-validation-with-zod.md).
* ❌ **Components do not manage global game state.** Keep transient game room and bluff turn states inside the Zustand store (`useGameStore`).

---

## 4. Anti-Gaming Rules (never make the harness green by cheating)

* ❌ Never edit, skip, or weaken tests in `backend/tests/Architecture.Tests/`, nor add `[Fact(Skip=...)]`, `#pragma warning disable`, `// eslint-disable`, `@ts-ignore`, or `any` to pass a gate.
* ❌ Never edit harness files (`scripts/`, `.githooks/`, `.github/`, `.agents/hooks.json`, `.claude/settings.json`, `AGENTS.md`) unless the user explicitly asks.
* ❌ Never hand-edit generated code (`frontend/src/shared/api/generated/**`, `frontend/openapi/**`, `**/Migrations/*.cs`) — regenerate it.
* ❌ Never use `git commit --no-verify` or replace real Postgres/Redis with mocks in integration tests.
* ✅ If a guardrail looks wrong, stop and explain why; propose an ADR. Fix the code, not the guardrail.

---

## 5. Deterministic Scaffolding (Mechanical Guardrails)

Markdown rules can be forgotten; these cannot:

| Enforcement point | What it checks | Where |
|---|---|---|
| `scripts/verify.sh --fast` | docs/ADR lint, `dotnet format`, build `-warnaserror`, architecture tests, ESLint, `tsc`, Vitest | agent Stop hook, pre-commit |
| `scripts/verify.sh` | everything above + Testcontainers integration tests + codegen drift | before commit, CI |
| PreToolUse hook | blocks edits to generated code; forces human approval for harness files and accepted ADRs | `.agents/hooks.json`, `.claude/settings.json` |
| Stop hook | agent cannot finish a turn with a dirty tree and failing `verify.sh --fast` | `.agents/hooks.json`, `.claude/settings.json` |
| `commit-msg` hook | Conventional Commits | `.githooks/` (`scripts/setup-hooks.sh`) |
| CI + CODEOWNERS | full verify on every PR; maintainer review for harness/ADR paths | `.github/` |

**Definition of Done:** `bash scripts/verify.sh` exits 0, new behavior has an integration test, contracts are regenerated, and the change is one atomic commit.

---

## 6. Execution & Verification Loop (ADR Implementation)

### Step 1: Scope Isolation
Inspect the target ADR and the one corresponding guideline. Limit changes strictly to the relevant module.

### Step 2: Spec & Diff Plan
Before generating or modifying code, provide: files to add/edit/remove, architectural boundaries touched, contract/migration impact, planned tests.

### Step 3: Self-Healing Verification Run
```bash
bash scripts/verify.sh --fast   # inner loop
bash scripts/verify.sh          # before commit (requires Docker)
```
On failure: read the failing gate → fix the code within the constraints above → re-run until exit code 0.

### Step 4: Atomic Git Commit
One ADR or feature = one commit, Conventional Commits, ADR referenced:
`feat(game-engine): implement bluff state transition (ADR 0003)`
