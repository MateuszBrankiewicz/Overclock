# 8. Replace MediatR with Compile-Time Source-Generated Mediator

Date: 2026-10-16

## Status

Accepted

Amends [0002](0002-technology-stack-and-modular-monolith.md)

## Context and Problem Statement

[ADR 0002](0002-technology-stack-and-modular-monolith.md) selected `MediatR` for CQRS orchestration and in-process domain events. However, starting with version 13.0, MediatR shifted from an MIT open-source license to a commercial and dual-licensing model under Lucky Penny Software (RPL-1.5 / Commercial).
- The RPL-1.5 (Reciprocal Public License) is a strict copyleft license that requires making all source code publicly available if software is accessed over a network.
- Relying on MediatR v12 (the last MIT-licensed release) introduces technical debt and blocks future .NET runtime improvements (e.g., Native AOT compilation).

We need an actively maintained, enterprise-friendly, MIT- or Apache-licensed in-process messaging and CQRS mediator for .NET 10.

## Decision Drivers

* **Permissive Open Source License:** Must be MIT or Apache 2.0 with zero commercial or copyleft constraints.
* **CQRS Pattern Parity:** Must support command/query dispatching, handler interfaces, pipeline behaviors, and domain notifications.
* **High Throughput & Low Latency:** Minimal runtime overhead, zero unnecessary reflection, and zero-allocation hot paths.
* **Native AOT & .NET 10 Compatibility:** Must integrate cleanly with modern .NET compilation without dynamic reflection.

## Considered Options

1. **Option 1: MediatR (v12.x pinned):** Free under MIT, but abandoned for newer .NET releases; no bug fixes or modern performance features.
2. **Option 2: Mediator (Martin Ullrich - `Mediator.SourceGenerator`):** Compile-time C# source generator, 100% MIT license, drop-in replacement for MediatR syntax (`ISender`, `IMediator`, `IRequest<T>`, `IPipelineBehavior`), zero reflection, zero runtime allocations.
3. **Option 3: Wolverine (JasperFx):** Modern command bus with outbox and local queues. High capability, but introduces heavier idioms and convention-based dispatch rather than explicit handler interfaces.
4. **Option 4: Hand-rolled CQRS interfaces in `SharedKernel`:** Zero external dependencies, but requires manual pipeline behavior plumbing and dispatch registration.

## Decision Outcome

Chosen Option: **Option 2: Mediator (`Mediator.SourceGenerator` + `Mediator.Abstractions`)**.

### Architectural Details

1. **Source Generation:**
   Instead of scanning assemblies via runtime reflection, `Mediator` inspects types during compilation and emits static dispatch code. This provides instant startup, zero reflection overhead, and full Native AOT compatibility.
2. **Syntax and Ergonomics:**
   The programming model remains nearly identical to MediatR:
   ```csharp
   using Mediator;

   public sealed record CallBluffCommand(string RoomCode, Guid AccuserPlayerId) : IRequest<Result<BluffResolutionDto>>;

   internal sealed class CallBluffCommandHandler(IRoomRegistry rooms) 
       : IRequestHandler<CallBluffCommand, Result<BluffResolutionDto>>
   {
       public async ValueTask<Result<BluffResolutionDto>> Handle(CallBluffCommand request, CancellationToken ct)
       {
           // ... handler implementation
       }
   }
   ```
   *Note: `Mediator` uses `ValueTask<T>` by default for optimized async execution without heap allocations.*
3. **Pipeline Behaviors:**
   Cross-cutting concerns (logging, metrics, and FluentValidation validation behaviors) implement `IPipelineBehavior<TMessage, TResponse>`.

### Enforcement

* Architecture tests in `tests/Architecture.Tests`:
  - Assert that domain and application projects do NOT reference `MediatR`.
  - Assert that command/query handlers implement `Mediator.IRequestHandler<,>`.
* `scripts/verify.sh` compiles and executes the test harness under .NET 10.

## Consequences

### Positive

* **100% Permissive MIT License:** Eliminates all legal and licensing risks from MediatR v13+.
* **Superior Performance:** Zero-allocation execution via `ValueTask` and compile-time generated dispatch tables; significantly faster than reflection-based MediatR.
* **Native AOT Ready:** Zero runtime code generation (`Reflection.Emit`) makes the backend ready for high-density, low-memory container deployments.
* **Low Migration Friction:** Near 1:1 API parity with MediatR (`ISender`, `IRequest<T>`, `INotification`).

### Negative

* Uses `ValueTask<T>` instead of `Task<T>` in handler signatures, requiring minor syntax adjustments.
* Relies on Roslyn Source Generators during build time (standard in modern .NET).
