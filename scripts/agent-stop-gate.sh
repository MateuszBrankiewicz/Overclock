#!/usr/bin/env bash
# ==============================================================================
# agent-stop-gate.sh — Stop hook: the agent may not finish a turn while the
# working tree is dirty and `verify.sh --fast` fails (ADR 0005, self-healing loop).
#
# Modes:
#   (default)   Antigravity Stop contract -> {"decision":"continue","reason":...}
#   --claude    Claude Code Stop contract -> exit 2 + stderr feedback
#
# Loop protection: gives up after MAX_ATTEMPTS forced continuations so a
# genuinely stuck agent hands control back to the human.
# ==============================================================================
set -uo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MODE="${1:-antigravity}"
MAX_ATTEMPTS=3
INPUT="$(cat)"

allow_stop() {
    [ "$MODE" = "--claude" ] && exit 0
    echo '{"decision":"stop"}'
    exit 0
}

if [ "$MODE" = "--claude" ]; then
    [ "$(jq -r '.stop_hook_active // false' <<<"$INPUT")" = "true" ] && allow_stop
else
    REASON_CODE=$(jq -r '.terminationReason // ""' <<<"$INPUT")
    ATTEMPT=$(jq -r '.executionNum // 1' <<<"$INPUT")
    [ "$REASON_CODE" != "NO_TOOL_CALL" ] && allow_stop
    [ "$ATTEMPT" -gt "$MAX_ATTEMPTS" ] && allow_stop
fi

cd "$ROOT_DIR"

# Nothing changed -> nothing to verify (pure Q&A turns are never blocked).
[ -z "$(git status --porcelain 2>/dev/null)" ] && allow_stop

OUTPUT=$(bash scripts/verify.sh --fast 2>&1)
STATUS=$?
[ "$STATUS" -eq 0 ] && allow_stop

FEEDBACK="Harness gate failed: 'scripts/verify.sh --fast' exited with $STATUS. You may not finish yet.
Fix the code so the failing gates pass. Do NOT weaken tests, linters, or harness scripts.
If the failure needs an architectural change, stop and draft an ADR (scripts/new-adr.sh) instead.

--- verify.sh output (tail) ---
$(tail -n 40 <<<"$OUTPUT")"

if [ "$MODE" = "--claude" ]; then
    echo "$FEEDBACK" >&2
    exit 2
fi
jq -n --arg r "$FEEDBACK" '{decision: "continue", reason: $r}'
