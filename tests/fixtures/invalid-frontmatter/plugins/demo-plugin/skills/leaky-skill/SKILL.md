---
name: leaky-skill
description: Fixture skill that leaks Claude-only frontmatter, so the portability check must reject it.
allowed-tools: Read Grep
---

# Leaky skill

`allowed-tools` is understood by Claude Code only. Cursor and Codex ignore it,
which makes this skill behave differently depending on where it is installed.
