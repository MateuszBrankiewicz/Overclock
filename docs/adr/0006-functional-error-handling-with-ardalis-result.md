# 6. Functional Error Handling with Ardalis.Result

Date: 2026-10-16

## Status

Proposed

## Context and Problem Statement

[ADR 0005](0005-ai-architecture-harness-and-deterministic-guardrails.md) forbids `throw new Exception(...)` for domain and validation errors and requires handlers to return `Result` / `Result<T>`. However, no ADR selects a concrete library, and the guidelines mixed two incompatible APIs (`ErrorOr`-style `Error.NotFound(...)` and `Ardalis.Result`). AI agents will pick whichever API they saw last, producing inconsistent handler signatures and transport mappings.

We need a single Result type shared by all modules (via `SharedKernel`), with first-class mapping to HTTP status codes and SignalR hub responses.

## Decision Drivers

* One Result type across all modules and both transports (REST + SignalR).
* Built-in mapping to ASP.NET Core results (no hand-written status switch per endpoint).
* Support for validation errors (FluentValidation pipeline behavior) and `NotFound` / `Conflict` / `Forbidden` semantics.
* Mature, MIT-licensed, actively maintained.

## Considered Options

1. **Ardalis.Result** (+ `Ardalis.Result.AspNetCore`, `Ardalis.Result.FluentValidation`).
2. **ErrorOr** — discriminated `ErrorOr<T>` with typed `Error` values.
3. **OneOf** — generic unions; no error semantics, every endpoint maps manually.
4. **Hand-rolled `Result<T>` in SharedKernel** — full control, but we re-implement mapping and validation glue.

## Decision Outcome

Chosen Option: **Option 1: Ardalis.Result**, because it ships status semantics (`NotFound`, `Invalid`, `Conflict`, `Forbidden`, `Unauthorized`, `Error`) and ready-made `ToMinimalApiResult()` / `ToActionResult()` mapping, which keeps controllers thin.

### Usage rules

* Handlers return `Result` or `Result<T>`; domain methods return `Result` / `Result<T>` as well.
* REST: `return result.ToMinimalApiResult();` (or `this.ToActionResult(result)` in controllers).
* SignalR: map to a `HubResponse` record in the Host layer only (`HubResponse.From(result)`).
* Exceptions remain only for unrecoverable infrastructure failures; a global exception handler maps them to RFC 7807 `500`.

### Enforcement

* Architecture test: every type implementing `IRequestHandler<,>` returns `Task<Result>` or `Task<Result<T>>` (`HandlersReturnResultTests`).
* Architecture test: `Domain` and `Application` assemblies do not reference `ErrorOr` or `OneOf`.
* Roslyn analyzer rule (planned): flag `throw new Exception` / `throw new InvalidOperationException` in `*.Domain` and `*.Application`.

## Consequences

### Positive

* Uniform handler signatures; trivially testable outcomes (`result.Status == ResultStatus.NotFound`).
* No per-endpoint status mapping code.

### Negative

* Adds a third-party dependency to `SharedKernel` (and transitively to every module).
* `Result<T>` errors are string-based; typed error codes must be agreed on per module (`"Room.NotFound"` convention).
