---
name: smuggled-skill
description: Fixture skill that ships without a components.skills declaration and carries Claude-only frontmatter.
model: opus
---

# Smuggled skill

All three agents load `skills/<name>/SKILL.md` by convention, so leaving it out of
`components` does not stop it from shipping — it only stops the naive gate from
looking at it.
