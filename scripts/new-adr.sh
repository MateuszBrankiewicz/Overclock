#!/usr/bin/env bash
# ==============================================================================
# new-adr.sh — Scaffold the next ADR from docs/adr/template.md and register it
# in docs/adr/README.md with status "Proposed".
#
# Usage: scripts/new-adr.sh "Short decision title"
# ==============================================================================
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ADR_DIR="$ROOT_DIR/docs/adr"

if [ $# -lt 1 ] || [ -z "$1" ]; then
    echo "Usage: $0 \"Short decision title\"" >&2
    exit 2
fi

TITLE="$1"
LAST=$(find "$ADR_DIR" -maxdepth 1 -name '[0-9][0-9][0-9][0-9]-*.md' -printf '%f\n' | sort | tail -n 1 | cut -c1-4)
NEXT=$((10#${LAST:-0} + 1))
NUM=$(printf '%04d' "$NEXT")
SLUG=$(echo "$TITLE" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9]+/-/g; s/^-+|-+$//g')
FILE="$NUM-$SLUG.md"
DATE=$(date +%F)

if [ -e "$ADR_DIR/$FILE" ]; then
    echo "ADR already exists: $FILE" >&2
    exit 1
fi

sed -e "1s/.*/# $NEXT. $TITLE/" -e "s/^Date: YYYY-MM-DD$/Date: $DATE/" \
    "$ADR_DIR/template.md" > "$ADR_DIR/$FILE"

printf '| [%s](%s) | [%s](%s) | **Proposed** | %s |\n' \
    "$NUM" "$FILE" "$TITLE" "$FILE" "$DATE" >> "$ADR_DIR/README.md"

echo "Created docs/adr/$FILE (Proposed) and registered it in docs/adr/README.md"
