# Project: Overclock (Dead Circuit)

> Browser-based, turn-based bluff game for 2–4 players combining traditional Liar's Dice/Cards mechanics with escalating Russian roulette tension in a lo-fi cyberpunk / retro-dystopian terminal setting.

---

## Tech Stack Overview

- **Backend:** .NET 10 (ASP.NET Core Web API, SignalR Hubs, MediatR CQRS, Modular Monolith)
- **Frontend:** React 19 (Latest) + TypeScript + Vite, Zustand, Tailwind CSS, Framer Motion, Howler.js, Zod
- **Persistence & Cache:** PostgreSQL (EF Core) + Redis (SignalR Backplane, distributed locks, session state)

---

## Documentation

- [`docs/PROJECT_CONCEPT.md`](file:///home/mateusz/Projects/liarsgame/docs/PROJECT_CONCEPT.md) — Vision, core loop, monetization, and Go-to-Market strategy.
- [`docs/adr/`](file:///home/mateusz/Projects/liarsgame/docs/adr/) — Architecture Decision Records (ADRs):
  - [ADR 0001: Record Architecture Decisions](file:///home/mateusz/Projects/liarsgame/docs/adr/0001-record-architecture-decisions.md)
  - [ADR 0002: Core Technology Stack: .NET, React, MediatR, PostgreSQL, and Redis](file:///home/mateusz/Projects/liarsgame/docs/adr/0002-technology-stack-and-modular-monolith.md)
  - [ADR 0003: Real-Time Game Loop: SignalR, In-Memory State Machine, and Redis Backplane](file:///home/mateusz/Projects/liarsgame/docs/adr/0003-realtime-engine-signalr-and-state-machine.md)
  - [ADR 0004: Runtime Model Validation and Type Inference with Zod](file:///home/mateusz/Projects/liarsgame/docs/adr/0004-runtime-model-validation-with-zod.md)
- [`docs/business/`](file:///home/mateusz/Projects/liarsgame/docs/business/) — Business & game design rules:
  - [PCB Data Cards Design Decision](file:///home/mateusz/Projects/liarsgame/docs/business/adr_pcb_data_cards_business_design_decision.md)
  - [Game Rules, Hardware Exploits & Balance Model](file:///home/mateusz/Projects/liarsgame/docs/business/game_rules_and_balance.md)
- [`.agents/skills/`](file:///home/mateusz/Projects/liarsgame/.agents/skills/) — AI Agent Skills & engineering playbooks.
