# Contributing

Team workflow rules. The canonical team agreement (roles, DoD, retros)
lives in Confluence — this file covers the Git/Jira mechanics.

## Branching and Jira keys

- One Jira issue -> one short-lived branch -> one PR.
- Branch: `BOOK-<n>-short-description` (e.g. `BOOK-8-create-booking`).
- Commit messages start with the key: `BOOK-8: lock room row before overlap check`.
- PR titles contain the key (CI enforces `BOOK-\d+`).

## Pull requests

- Fill every section of the PR template (problem, result, verification,
  risks, AI-assistance).
- One approval from a teammate is required before merge; CI must be green.
- Reviewers label comments BLOCKER / SUGGESTION / QUESTION. A bare
  "looks good" is not a review — engage with logic, contract, rights,
  tests, or risk.
- Stubs marked `TODO(BOOK-n)` belong to their assignee — don't implement
  someone else's task.

## Definition of Done

1. Acceptance criteria in the Jira issue are met.
2. CI green (lint, typecheck, tests, build).
3. Review approved.
4. Docs updated if behavior, API contract, or runbook changed.
5. Jira issue moved to Done with a link to the merged PR.

## Releases

- `v1.0` tag after КТ-4; never rewritten afterwards.
- `v2.0` tag at the end. Each release: short changelog, commit link, CI
  result, artifact name (`booking-app-<sha>.tar.gz`).

## Local setup

See README.md. Install exactly: Node 20+, Docker, npm.
