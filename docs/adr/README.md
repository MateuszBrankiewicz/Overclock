# Architecture Decision Records (ADR)

This directory contains the Architecture Decision Records (ADRs) for **Project: Overclock** (*Dead Circuit*).

We follow the [Michael Nygard / MADR](https://adr.github.io/madr/) format to capture context, considered alternatives, and the rationale behind architectural and technological decisions.

## Workflow

1. Create a new record from the template: `scripts/new-adr.sh "Short decision title"` (status starts as **Proposed**).
2. Fill in every section, including **Enforcement** — how the decision is mechanically checked.
3. A human maintainer flips the status to **Accepted** (AI agents may only draft `Proposed` records).
4. Superseding a decision: set the old record to `Superseded by [NNNN](...)`; never delete or rewrite accepted records.

`scripts/check-docs.sh` validates numbering, status values, title/filename consistency, and that this index matches each file's status. It runs in `verify.sh`, the pre-commit hook, and CI.

## Index of Decisions

| ID | Title | Status | Date |
| :--- | :--- | :--- | :--- |
| [0001](0001-record-architecture-decisions.md) | [Record Architecture Decisions](0001-record-architecture-decisions.md) | **Accepted** | 2026-10-15 |
| [0002](0002-technology-stack-and-modular-monolith.md) | [Core Technology Stack: .NET, React, MediatR, PostgreSQL, and Redis](0002-technology-stack-and-modular-monolith.md) | **Accepted** | 2026-10-15 |
| [0003](0003-realtime-engine-signalr-and-state-machine.md) | [Real-Time Game Loop: SignalR, In-Memory State Machine, and Redis Backplane](0003-realtime-engine-signalr-and-state-machine.md) | **Accepted** | 2026-10-15 |
| [0004](0004-runtime-model-validation-with-zod.md) | [Runtime Model Validation and Type Inference with Zod](0004-runtime-model-validation-with-zod.md) | **Accepted** | 2026-10-15 |
| [0005](0005-ai-architecture-harness-and-deterministic-guardrails.md) | [AI Architecture Harness and Deterministic Guardrails](0005-ai-architecture-harness-and-deterministic-guardrails.md) | **Accepted** | 2026-10-16 |
| [0006](0006-functional-error-handling-with-ardalis-result.md) | [Functional Error Handling with Ardalis.Result](0006-functional-error-handling-with-ardalis-result.md) | **Accepted** | 2026-10-16 |
| [0007](0007-api-contract-pipeline-orval-and-zod.md) | [API Contract Pipeline: OpenAPI → Orval and SignalR Contract Schemas](0007-api-contract-pipeline-orval-and-zod.md) | **Accepted** | 2026-10-16 |
| [0008](0008-replace-mediatr-with-compile-time-source-generated-mediator.md) | [Replace MediatR with Compile-Time Source-Generated Mediator](0008-replace-mediatr-with-compile-time-source-generated-mediator.md) | **Accepted** | 2026-10-16 |
| [0009](0009-voltage-test-hardware-exploits-and-timing-windows.md) | [Voltage Test, Hardware Exploits and Timing Windows](0009-voltage-test-hardware-exploits-and-timing-windows.md) | **Proposed** | 2026-11-11 |
