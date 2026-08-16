---
name: colon-skill
description: Use when scaffolding a build on Maven with Scala sources: pom.xml layout, compile commands.
---

# Colon skill

An unquoted value carrying a colon and a space reads as a nested mapping, not as
a string. Every field here is well formed to the naive reader — the name matches
the directory, the description opens with a capital — so nothing but a YAML rule
catches it, and the skill would install with no name and no description at all.
