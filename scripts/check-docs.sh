#!/usr/bin/env bash
# ==============================================================================
# check-docs.sh — Deterministic lint for the Context Layer (ADR 0005)
#
#   * ADR files: naming, numbering (contiguous, unique), title/filename match,
#     valid "## Status" value, index (docs/adr/README.md) in sync with files.
#   * Markdown links in README.md, AGENTS.md, CLAUDE.md and docs/**:
#     no absolute file:// links, every relative link resolves.
#
# Exit code 0 = clean, 1 = violations found.
# ==============================================================================
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

python3 - <<'PY'
import pathlib, re, sys

root = pathlib.Path(".")
adr_dir = root / "docs" / "adr"
errors = []

STATUS_RE = re.compile(
    r"^(Proposed|Accepted|Rejected|Deprecated|Superseded by \[\d{4}\]\(\d{4}-[a-z0-9-]+\.md\))$"
)
FILE_RE = re.compile(r"^(\d{4})-[a-z0-9-]+\.md$")

# ---------------------------------------------------------------- ADR files --
adrs = {}
for f in sorted(adr_dir.glob("*.md")):
    if f.name in ("README.md", "template.md"):
        continue
    m = FILE_RE.match(f.name)
    if not m:
        errors.append(f"{f}: ADR filename must match NNNN-kebab-case-title.md")
        continue
    num = int(m.group(1))
    if num in adrs:
        errors.append(f"{f}: duplicate ADR number {num:04d}")
    lines = f.read_text(encoding="utf-8").splitlines()

    if not lines or not re.match(rf"^# {num}\. \S", lines[0]):
        errors.append(f"{f}: first line must be '# {num}. <Title>'")

    status = None
    for i, line in enumerate(lines):
        if line.strip() == "## Status":
            for nxt in lines[i + 1:]:
                if nxt.strip():
                    status = nxt.strip()
                    break
            break
    if status is None:
        errors.append(f"{f}: missing '## Status' section")
    elif not STATUS_RE.match(status):
        errors.append(f"{f}: invalid status '{status}' (Proposed|Accepted|Rejected|Deprecated|Superseded by [NNNN](file))")
    adrs[num] = (f, status.split(" ")[0] if status else None)

if adrs:
    expected = list(range(1, max(adrs) + 1))
    missing = [n for n in expected if n not in adrs]
    if missing:
        errors.append(f"docs/adr: non-contiguous ADR numbering, missing {', '.join(f'{n:04d}' for n in missing)}")

# --------------------------------------------------------------- ADR index --
index = adr_dir / "README.md"
ROW_RE = re.compile(r"^\|\s*\[(\d{4})\]\(([^)]+)\)\s*\|.*\|\s*\*\*(\w+)\*\*\s*\|")
indexed = {}
for line in index.read_text(encoding="utf-8").splitlines():
    m = ROW_RE.match(line)
    if m:
        indexed[int(m.group(1))] = (m.group(2), m.group(3))

for num, (f, status) in adrs.items():
    if num not in indexed:
        errors.append(f"{index}: ADR {num:04d} ({f.name}) is not listed in the index")
        continue
    target, idx_status = indexed[num]
    if target != f.name:
        errors.append(f"{index}: ADR {num:04d} links to '{target}', expected '{f.name}'")
    if status and idx_status != status:
        errors.append(f"{index}: ADR {num:04d} status is '{idx_status}' in index but '{status}' in file")
for num in indexed:
    if num not in adrs:
        errors.append(f"{index}: index lists ADR {num:04d} but no such file exists")

# ------------------------------------------------------------ Markdown links --
md_files = [root / p for p in ("README.md", "AGENTS.md", "CLAUDE.md") if (root / p).exists()]
md_files += sorted((root / "docs").rglob("*.md"))
LINK_RE = re.compile(r"\]\(([^)\s]+)(?:\s+\"[^\"]*\")?\)")

for f in md_files:
    in_fence = False
    in_comment = False
    for n, line in enumerate(f.read_text(encoding="utf-8").splitlines(), 1):
        if line.lstrip().startswith("```"):
            in_fence = not in_fence
            continue
        if in_fence:
            continue
        # Drop HTML comments (possibly multi-line) and inline code spans.
        if in_comment:
            if "-->" not in line:
                continue
            line = line.split("-->", 1)[1]
            in_comment = False
        line = re.sub(r"<!--.*?-->", "", line)
        if "<!--" in line:
            line = line.split("<!--", 1)[0]
            in_comment = True
        line = re.sub(r"`[^`]*`", "", line)
        for target in LINK_RE.findall(line):
            if target.startswith("file://"):
                errors.append(f"{f}:{n}: absolute file:// link is not portable: {target}")
                continue
            if re.match(r"^(https?:|mailto:|#)", target):
                continue
            path = target.split("#", 1)[0]
            if path and not (f.parent / path).exists():
                errors.append(f"{f}:{n}: broken relative link: {target}")

if errors:
    print("❌ check-docs: %d violation(s)" % len(errors))
    for e in errors:
        print("  - " + e)
    sys.exit(1)
print(f"✅ check-docs: {len(adrs)} ADRs and {len(md_files)} markdown files are consistent")
PY
