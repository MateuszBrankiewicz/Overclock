# 17. Production Scalability SignalR Redis Backplane Rate Limiting and Stats Persistence

Date: 2026-11-13

## Status

Accepted

<!--
Allowed values (validated by scripts/check-docs.sh):
  Proposed | Accepted | Rejected | Deprecated | Superseded by [NNNN](NNNN-title.md)
Optional extra line: "Amends [NNNN](NNNN-title.md)".
-->

## Context and Problem Statement

Phase 4 of the [development roadmap](../roadmaps/development-roadmap.md) prepares **Project: Overclock** (*Dead Circuit*) for production deployment:

1. **SignalR Scale-Out & Redis Backplane:** [ADR 0003](0003-realtime-engine-signalr-and-state-machine.md) specifies Redis Pub/Sub as the SignalR backplane and Redis room metadata lookup, requiring `Microsoft.AspNetCore.SignalR.StackExchangeRedis` in `Overclock.Host` and a new `overclock:signalr` channel prefix.
2. **Cross-Module Match Stats Persistence:** `GameEngine` must emit `MatchFinishedEvent` (`GameEngine.Contracts`) when a match reaches `RoomState.GameOver` so `Stats` (`StatsDbContext`, PostgreSQL `stats` schema) persists post-match records asynchronously without blocking the room's single-writer loop.
3. **DoS & Resource Protection:** Behind Nginx, rate limiting requires `ForwardedHeaders` (`X-Forwarded-For`, `X-Forwarded-Proto`), per-IP HTTP rate limiting, and per-connection/per-IP SignalR hub rate limiting.
4. **Probes:** Container orchestration requires `/healthz` (liveness) and `/readyz` (readiness for Redis and `stats.match_records` in PostgreSQL).

## Decision Drivers

* Preserve module isolation: `Stats` may only reference `GameEngine.Contracts`, never `GameEngine.Domain` or `GameEngine.Application`.
* Keep the active turn loop free of database I/O; PostgreSQL writes happen asynchronously after `GameOver`.
* Maintain graceful degradation in local/smoke test environments when `ConnectionStrings:Redis` or `ConnectionStrings:Database` is omitted.
* Enforce `overclock:{module}:{entity}:{id}` Redis key naming and explicit TTLs.

## Considered Options

1. **Option 1 (Chosen):** Add `Microsoft.AspNetCore.SignalR.StackExchangeRedis` (`10.0.15`) with channel prefix `overclock:signalr`, `RedisRoomMetadataStore` (`overclock:game:room:{id}`, 2-hour TTL), `SignalRRateLimitHubFilter` + HTTP `RateLimiter` with `ForwardedHeaders`, and `MatchFinishedEvent` (`GameEngine.Contracts`) handled asynchronously via `IServiceScopeFactory` in `Stats.Application` with `StatsDbContext` (`stats` schema) migrated on startup.
2. **Option 2:** Move the full `GameRoom` state machine out of process into Redis/PostgreSQL on every turn. Rejected because ADR 0003 requires microsecond in-memory single-writer execution.

## Decision Outcome

Chosen Option: **Option 1**.

* `GameRoom` continues executing on a single-writer in-memory loop per ADR 0003 (sticky sessions / single active owner per room; Redis backplane relays SignalR group broadcasts across instances).
* `RedisRoomMetadataStore` catches `RedisException`, `TimeoutException` (including `RedisTimeoutException`), and `JsonException` so cache misses or transient timeouts never cause 500 errors.
* `StatsDbContext` migrations are applied automatically on host startup via `ApplyStatsMigrationsAsync()` when `ConnectionStrings:Database` is configured.

### Enforcement

* `Architecture.Tests` (`LayerTests`) verifies `Stats` only depends on `GameEngine.Contracts` and never `GameEngine.{Domain,Application,Infrastructure}`, and that `Hubs`/`Endpoints` do not reference `DbContext` or `StackExchange.Redis`.
* `Integration.Tests` (`Phase4ProductionReadinessTests`) verifies `/healthz`, `/readyz`, HTTP `429` rate limiting, Redis SignalR backplane group relay + `overclock:game:room:{id}` TTL (Testcontainers Redis), and `MatchFinishedEvent` persistence in `stats.match_records` (Testcontainers Postgres).
* `scripts/verify.sh` enforces formatting, `-warnaserror`, architecture tests, integration tests, and frontend checks.

## Consequences

### Positive

* Production-ready health probes, rate limiting behind Nginx, and isolated post-match persistence in `stats.match_records`.
* Zero database I/O during active match turns.

### Negative

* Adds `Microsoft.AspNetCore.SignalR.StackExchangeRedis` (`10.0.15`) to `Overclock.Host` and `Microsoft.EntityFrameworkCore.Design` (`10.0.4`) to `Stats.Infrastructure`.
* Full multi-node room ownership migration (if a player joins via a different node than the room host) remains future work beyond the SignalR Pub/Sub backplane.
