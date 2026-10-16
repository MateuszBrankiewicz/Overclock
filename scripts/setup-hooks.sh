#!/usr/bin/env bash
# ==============================================================================
# setup-hooks.sh — One-time developer setup: activate versioned git hooks.
# ==============================================================================
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

git config core.hooksPath .githooks
chmod +x .githooks/* scripts/*.sh
echo "✅ git hooks active (core.hooksPath=.githooks): pre-commit, commit-msg"
