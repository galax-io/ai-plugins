# Pull request

## What changed

<!-- One or two sentences. Which plugin, and what it now does. -->

## Checklist

- [ ] Only `plugin.meta.json` / `marketplace.meta.json` edited by hand; generated manifests come from `npm run sync`
- [ ] `npm run check && npm test` pass locally
- [ ] `claude plugin validate ./plugins/<name> --strict` passes
- [ ] Skill frontmatter is `name` + `description` only
- [ ] `description` leads with the primary use case and the words a real request would use
- [ ] `version` bumped and `CHANGELOG.md` updated (required for any change under `plugins/`)
- [ ] No credentials, no machine-specific absolute paths

## Verified in

<!-- Which agent did you actually install and run this in? Claude Code / Cursor / Codex -->
