---
name: lonely-skill
description: Fixture skill whose reference tree is half unreachable, so the reference check has a known-bad input.
---

# Lonely skill

One reference is linked, the other is not.

- [references/linked.md](references/linked.md)

This link leaves the skill. Following it would reach the fixture README, which links the
orphan — so the boundary in `reach()` is what keeps the orphan unreachable, and removing it
makes this fixture pass.

- [fixture README](../../../../README.md)
