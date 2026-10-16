# Project: Overclock (Dead Circuit)

> Browser-based, turn-based bluff game for 2–4 players combining traditional Liar's Dice/Cards mechanics with escalating Russian roulette tension in a lo-fi cyberpunk / retro-dystopian terminal setting.

---

## Tech Stack Overview

- **Backend:** .NET 10 (ASP.NET Core Web API, SignalR Hubs, MediatR CQRS, Modular Monolith)
- **Frontend:** React 19 (Latest) + TypeScript + Vite, Zustand, Tailwind CSS, Framer Motion, Howler.js, Zod
- **Persistence & Cache:** PostgreSQL (EF Core) + Redis (SignalR Backplane, distributed locks, session state)

---

## Getting Started (contributors & AI agents)

```bash
bash scripts/setup-hooks.sh     # activate pre-commit + commit-msg hooks
bash scripts/verify.sh --fast   # inner-loop verification
bash scripts/verify.sh          # full verification (requires Docker for Testcontainers)
scripts/new-adr.sh "Title"      # draft a new Architecture Decision Record
```

AI coding agents read [`AGENTS.md`](AGENTS.md) (Claude Code: [`CLAUDE.md`](CLAUDE.md) imports it). The harness is described in [ADR 0005](docs/adr/0005-ai-architecture-harness-and-deterministic-guardrails.md).

---

## Documentation

- [`docs/PROJECT_CONCEPT.md`](docs/PROJECT_CONCEPT.md) — Vision, core loop, monetization, and Go-to-Market strategy.
- [`docs/adr/`](docs/adr/README.md) — Architecture Decision Records (index with statuses).
- [`docs/architecture/`](docs/architecture/) — Technical standards:
  - [Backend guidelines](docs/architecture/backend-guidelines.md)
  - [Frontend guidelines](docs/architecture/frontend-guidelines.md)
  - [Testing & verification](docs/architecture/testing.md)
- [`docs/business/`](docs/business/) — Business & game design rules:
  - [PCB Data Cards Design Decision](docs/business/adr_pcb_data_cards_business_design_decision.md)
  - [Game Rules, Hardware Exploits & Balance Model](docs/business/game_rules_and_balance.md)
- [`.agents/skills/`](.agents/skills/) — AI Agent Skills & engineering playbooks (including `implement-adr`).
