# CLAUDE.md

All project rules live in `AGENTS.md` (single source of truth — do not duplicate rules here).

@AGENTS.md

## Claude Code specifics

- Hooks in `.claude/settings.json` enforce the harness: protected-path guard (PreToolUse) and the
  verification Stop gate (`scripts/verify.sh --fast` must pass before you finish a turn with changes).
- For ADR work, follow `.agents/skills/implement-adr/SKILL.md`.
