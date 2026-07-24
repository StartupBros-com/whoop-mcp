# Upstream relationship

- **Upstream:** https://github.com/izqui/whoop-mcp
- **Divergence (as of 2026-07-24):** +3 ahead / -0 behind upstream default branch
- **Fork type:** Contribution/maintenance fork
- **Sync cadence:** Manual; candidate for upstream PR.

## StartupBros-specific delta

Live Whoop MCP server used by will-os. Carries an auth fix that syncs tokens after interactive login.

## Why this file exists

An org-wide audit on 2026-07-24 found that comparing only the *default* branch made
several forks look like zero-delta mirrors when they actually carried unmerged
StartupBros fixes on side branches. Any future fork-pruning pass must enumerate and
author-check **all** branches, not just default-branch ahead/behind.
