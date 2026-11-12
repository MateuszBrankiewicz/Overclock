# Taski implementacyjne — Dead Circuit

> Utworzono: 2026-11-12 · Gałąź robocza: `feat/frontend-ux-and-graphics`
>
> Każdy plik to jeden atomowy commit (Conventional Commits, z numerem ADR / buga w treści).
> Zasady nadrzędne: [AGENTS.md](../../AGENTS.md), [ADR index](../adr/README.md),
> [testing.md](../architecture/testing.md).

## Kolejność realizacji

| # | Plik | Typ | Zależy od | Zakres |
|---|---|---|---|---|
| 1 | [BUG-01](BUG-01-remove-card-reveal-modal.md) | bug | — | frontend |
| 2 | [BUG-02](BUG-02-next-round-modal-after-whole-check.md) | bug | BUG-01 | frontend |
| 3 | [T-0015](T-0015-authoritative-turn-deadline.md) | ADR 0015 | — | backend + frontend + kontrakt |
| 4 | [T-0011](T-0011-leave-room.md) | ADR 0011 | — | backend + frontend + kontrakt |
| 5 | [T-0013](T-0013-server-driven-round-advance.md) | ADR 0013 | T-0011 (wspólny helper hosta), BUG-02 | backend + frontend + kontrakt |
| 6 | [T-0012](T-0012-character-sync.md) | ADR 0012 | — | backend + frontend + kontrakt |
| 7 | [T-0014](T-0014-audio-engine.md) | ADR 0014 | — | frontend |
| 8 | [T-0016](T-0016-robot-voices.md) | nowy ADR 0016 | T-0014, T-0012 | frontend |

## Etap 2 — UX rozgrywki i oprawa graficzna

> Utworzono: 2026-11-12 · Wszystkie taski są tylko po stronie frontendu i nie zmieniają kontraktów.

| # | Plik | Typ | Zależy od | Efekt |
|---|---|---|---|---|
| 1 | [UX-01](UX-01-trace-verdict-banner.md) | UX | — | czytelny werdykt po TRACE |
| 2 | [UX-02](UX-02-hud-declutter.md) | UX | — | mniej duplikatów i kolizji w HUD |
| 3 | [UX-03](UX-03-missing-sfx-and-haptics.md) | UX / ADR 0014 | — | dźwięk i wibracja dla każdej akcji |
| 4 | [GFX-01](GFX-01-bloom-and-postprocessing.md) | grafika | — (sprawdź ADR 0010) | bloom, tone mapping, przełącznik jakości |
| 5 | [GFX-02](GFX-02-lighting-and-bunker-environment.md) | grafika | — | klimatyczne światło, podłoga, tło |
| 6 | [UX-04](UX-04-voltage-test-suspense.md) | UX | — | suspens przed wynikiem testu napięcia |
| 7 | [UX-05](UX-05-cinematic-camera.md) | UX | — | kamera pokazuje, kogo dotyczy akcja |
| 8 | [GFX-03](GFX-03-vfx-cards-and-discharge.md) | grafika | GFX-01 | cząsteczki, smugi, hologram protokołu |
| 9 | [UX-06](UX-06-pacing-and-skip.md) | UX | UX-01 | krótsze przerwy, pomijanie kinematyk |
| 10 | [GFX-04](GFX-04-ui-visual-language.md) | grafika | UX-02 | spójne panele, ikony, typografia |
| 11 | [UX-07](UX-07-reduced-motion.md) | dostępność | UX-04, UX-05, GFX-03 | pełne `prefers-reduced-motion` |
| 12 | [UX-08](UX-08-game-over-and-spectator.md) | UX | UX-03, UX-05 | finał meczu, tryb widza |
| 13 | [GFX-05](GFX-05-landing-screen.md) | grafika | GFX-04 | ekran startowy w klimacie areny |

## Wymagania wstępne środowiska

- [ ] Zainstalowany ASP.NET Core runtime + targeting pack (na Archu: `sudo pacman -S aspnet-runtime aspnet-targeting-pack`).
  Bez tego `dotnet restore` / build / `Architecture.Tests` w `scripts/verify.sh --fast` nie przejdą (`NETSDK1127`).
- [ ] Docker uruchomiony (Testcontainers: Postgres, Redis) — wymagany przez pełne `bash scripts/verify.sh`.
- [ ] `bash scripts/setup-hooks.sh` wykonane (hook `commit-msg`).

## Stały schemat każdego taska

1. Przeczytaj ADR i jedną właściwą guideline (backend / frontend / testing).
2. Najpierw testy, które opisują oczekiwane zachowanie (powinny być czerwone).
3. Implementacja krok po kroku wg pliku taska.
4. Kontrakty: `SignalRContractFixtureTests` regeneruje fixture w `tests/contracts/signalr/`; Zod w `frontend/src/features/game/schemas/gameEvents.ts`.
   Nigdy nie edytuj ręcznie `frontend/src/shared/api/generated/**`, `frontend/openapi/**`, `**/Migrations/*.cs`.
5. `bash scripts/verify.sh --fast` w pętli, na końcu `bash scripts/verify.sh`.
6. Jeden commit, np. `feat(game-engine): add LeaveRoom hub method (ADR 0011)`.

## Zakazy (skrót z AGENTS.md)

- Bez modyfikacji `backend/tests/Architecture.Tests/`, bez `Skip`, `#pragma warning disable`, `eslint-disable`, `@ts-ignore`, `any`.
- Mutacje stanu pokoju tylko w `session.EnqueueAsync(room => ...)`.
- Hub tylko waliduje wywołującego (`ValidateCaller`) i wysyła komendę przez `ISender.Send`.
- Błędy domenowe jako `Result` / `Result<T>`, nie wyjątki.
- Payloady SignalR na froncie tylko przez Zod `safeParse`, bez `as EventType`.
