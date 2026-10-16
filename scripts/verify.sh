#!/usr/bin/env bash
# ==============================================================================
# verify.sh — Deterministic verification loop for Project: Overclock (ADR 0005)
#
# Used by developers, git hooks, CI and AI agents (self-healing loop).
#
#   scripts/verify.sh          full run (includes Testcontainers + codegen drift)
#   scripts/verify.sh --fast   inner loop (docs, format, build, arch tests, lint)
#
# Design rules:
#   * A gate is SKIPPED only when the layer it guards does not exist yet.
#   * Once a layer exists, its guardrail is MANDATORY (missing guardrail = FAIL).
#   * Never prints SUCCESS when something was skipped — prints PARTIAL instead.
# ==============================================================================
set -uo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

export DOTNET_SYSTEM_NET_DISABLEIPV6=1

MODE="full"
[ "${1:-}" = "--fast" ] && MODE="fast"

FRONTEND_DIR="frontend"
ARCH_TESTS="backend/tests/Architecture.Tests/Architecture.Tests.csproj"
INTEG_TESTS="backend/tests/Integration.Tests/Integration.Tests.csproj"
GENERATED_API="$FRONTEND_DIR/src/shared/api/generated"
OPENAPI_SPEC_DIR="$FRONTEND_DIR/openapi"

PASS=0; FAIL=0; SKIP=0
FAILED_GATES=()

pass() { echo "  ✅ PASS  $1"; PASS=$((PASS + 1)); }
fail() { echo "  ❌ FAIL  $1"; FAIL=$((FAIL + 1)); FAILED_GATES+=("$1"); }
skip() { echo "  ⚠️  SKIP  $1"; SKIP=$((SKIP + 1)); }
step() { echo ""; echo "▶ $1"; }

run_gate() { # run_gate "<name>" <command...>
    local name="$1"; shift
    if "$@"; then pass "$name"; else fail "$name"; fi
}

echo "=========================================================="
echo " Overclock harness — verify ($MODE)"
echo "=========================================================="

# ------------------------------------------------------------------ 1. Docs --
step "Context layer (ADR + markdown lint)"
run_gate "check-docs" bash scripts/check-docs.sh

# --------------------------------------------------------------- 2. Backend --
SOLUTION=$(find backend -maxdepth 1 \( -name '*.slnx' -o -name '*.sln' \) -print -quit 2>/dev/null || true)
[ -z "$SOLUTION" ] && SOLUTION=$(find . -maxdepth 1 \( -name '*.slnx' -o -name '*.sln' \) -print -quit)
HAS_BACKEND=$(find backend -name '*.csproj' -print -quit 2>/dev/null || true)

step "Backend (.NET)"
if [ -z "$HAS_BACKEND" ]; then
    skip "backend not scaffolded yet (no backend/**/*.csproj)"
else
    if [ -z "$SOLUTION" ]; then
        fail "solution file (*.slnx / *.sln) missing in backend/"
    else
        run_gate "dotnet restore" dotnet restore "$SOLUTION" --verbosity quiet
        run_gate "dotnet format --verify-no-changes" dotnet format "$SOLUTION" --verify-no-changes --no-restore --verbosity quiet
        run_gate "dotnet build (warnings as errors)" dotnet build "$SOLUTION" --no-restore -warnaserror --verbosity quiet
    fi

    # Mandatory guardrail: backend code without architecture tests is a FAIL.
    if [ -f "$ARCH_TESTS" ]; then
        run_gate "architecture tests (NetArchTest)" dotnet test "$ARCH_TESTS" --no-build --verbosity quiet
    else
        fail "architecture tests missing ($ARCH_TESTS) — required once backend exists"
    fi

    if [ "$MODE" = "fast" ]; then
        skip "integration tests (fast mode)"
    elif [ ! -f "$INTEG_TESTS" ]; then
        fail "integration tests missing ($INTEG_TESTS) — required once backend exists"
    elif ! docker info >/dev/null 2>&1; then
        fail "integration tests need a running Docker daemon (Testcontainers)"
    else
        run_gate "integration tests (Testcontainers)" dotnet test "$INTEG_TESTS" --no-build --verbosity quiet
    fi
fi

# -------------------------------------------------------------- 3. Frontend --
step "Frontend (React + TypeScript)"
if [ ! -f "$FRONTEND_DIR/package.json" ]; then
    skip "frontend not scaffolded yet ($FRONTEND_DIR/package.json)"
else
    if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
        run_gate "npm ci" npm --prefix "$FRONTEND_DIR" ci --no-audit --no-fund --silent
    fi
    run_gate "eslint" npm --prefix "$FRONTEND_DIR" run --silent lint
    run_gate "typecheck" npm --prefix "$FRONTEND_DIR" run --silent typecheck
    if npm --prefix "$FRONTEND_DIR" pkg get scripts.test | grep -qv '{}'; then
        run_gate "vitest" npm --prefix "$FRONTEND_DIR" run --silent test -- --run
    else
        fail "no 'test' script in $FRONTEND_DIR/package.json (Zod schema tests are mandatory)"
    fi

    # Contract drift (ADR 0007): regenerate and require a clean diff.
    if [ "$MODE" = "fast" ]; then
        skip "codegen drift check (fast mode)"
    elif npm --prefix "$FRONTEND_DIR" pkg get scripts.codegen:api | grep -qv '{}'; then
        if npm --prefix "$FRONTEND_DIR" run --silent codegen:api; then
            run_gate "API contract in sync (codegen:api produced no diff)" \
                git diff --quiet --exit-code -- "$GENERATED_API" "$OPENAPI_SPEC_DIR"
        else
            fail "npm run codegen:api"
        fi
    else
        fail "no 'codegen:api' script in $FRONTEND_DIR/package.json (ADR 0007)"
    fi
fi

# --------------------------------------------------------------- Summary --
echo ""
echo "=========================================================="
echo " PASS: $PASS   FAIL: $FAIL   SKIP: $SKIP"
if [ "$FAIL" -gt 0 ]; then
    echo " 🚨 FAILURE — fix these gates (do not weaken them):"
    for g in "${FAILED_GATES[@]}"; do echo "   - $g"; done
    exit 1
elif [ "$SKIP" -gt 0 ]; then
    echo " 🟡 PARTIAL — all existing gates passed, $SKIP gate(s) not applicable yet."
    exit 0
else
    echo " 🎉 SUCCESS — all guardrails passed."
    exit 0
fi
