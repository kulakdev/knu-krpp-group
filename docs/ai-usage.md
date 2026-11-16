# AI / LLM usage declaration (lab section 15)

The team uses generative tools within academic-integrity rules. Borrowed
components and material assistance are recorded here. Each member is
responsible for verifying and being able to explain anything submitted
under their name.

## Standing rules

1. Every PR declares AI assistance (checkbox in the PR template).
2. No code is committed that the author cannot walk through unaided at the
   defense.
3. Agents never implement stubs marked `TODO(BOOK-n)` autonomously — those
   are assigned individual contributions (docs/backlog.md).
4. Agents never fabricate process evidence (reviews, retrospectives,
   incident timelines). Drafting documents from real artifacts (git log,
   Jira export) is allowed; inventing history is not.

## Division of work

AI tools were used for **project management** (Jira and Confluence),
**documentation** and **writing code and tests**. People decided what to
build and how: scope and priorities, the split of tasks, architecture
decisions (ADR-001/002, the v2.0 approach, the UI structure in BOOK-36
taken from a team member's existing project), reviewed every change,
merged it, and answer for it at the defence. Measurements and checks
quoted in Jira (tests, smoke, QR-3) are real outputs of runs on a team
member's machine; the agent ran the commands, a person read the results.

Code that reached `main` through a teammate as a `git apply` patch is
listed as such: it was generated with AI at Danylo's request, then
applied, reviewed and merged by Kostiantyn.

## Log

| Date | Member | Tool | Used for | Verified by |
|---|---|---|---|---|
| 2026-09-17 | tech lead | Kilo (kimi-k3) | Repo bootstrap: scaffold, configs, infra scripts, docs skeletons, task stubs | tech lead |
| 2026-10-25 | Danylo Filatov | Claude Code (Opus 5.5) + Atlassian MCP | Jira backlog from docs/backlog.md (BOOK-1..24, links), Confluence page skeletons, README/backlog doc sync | Danylo Filatov |
| 2026-10-25 – 2026-11-16 | Danylo Filatov | Claude Code (Opus 5.5) + Atlassian MCP | Project management: new issues and subtasks (BOOK-25..42), assignments, "blocks" chains, status changes, comments with PR / commit / verification evidence; Confluence updates | Danylo Filatov |
| 2026-10-30 – 2026-11-03 | Danylo Filatov | Claude Code (Opus 5.5) | Code, tests and docs for own tasks: BOOK-8, 10, 11, 12, 13, 15, 16, 17, 25; CI fixes BOOK-26, 27; UI refactoring BOOK-36, 37 (structure chosen by Danylo). The agent also ran lint / typecheck / tests / browser checks | Danylo Filatov (review, merge) |
| 2026-10-30 – 2026-11-03 | Danylo Filatov → Kostiantyn Kulak | Claude Code (Opus 5.5) | Code and tests generated as `git apply` patches: BOOK-6, 7, 9, 14 | Kostiantyn Kulak (applied, reviewed, merged — PRs #3, #11, #12) |
| 2026-11-03 | Danylo Filatov | Claude Code (Opus 5.5) | v2.0 impact analysis and ADR-001 review draft (BOOK-29); risk V5 found in this review | Danylo Filatov |
| 2026-11-03 | Danylo Filatov → Kostiantyn Kulak | Claude Code (Opus 5.5) | Code, tests, migrations and docs generated as a chain of `git apply` patches: BOOK-38, 39, 40 (extra story BOOK-22) and BOOK-30..35 (v2.0) | Kostiantyn Kulak (applied, reviewed, merged — PRs #19–#26, #28, #29) |
| 2026-11-05 | Kostiantyn Kulak | Claude | Fix for BOOK-41 from a problem description written with Claude Code | Kostiantyn Kulak (PR #27) |
| 2026-11-16 | Danylo Filatov | Claude Code (Opus 5.5) | Release checks: smoke on the v2.0 production build, official QR-3 run (BOOK-28); this log | Danylo Filatov |
| 2026-11-16 | Danylo Filatov | Claude Code (Opus 5.5) + Atlassian MCP | Incident drill guides (BOOK-43); 503 for an unreachable database (BOOK-44) and error details in the operation log (BOOK-45), including the merge-conflict resolution; Confluence "1. Team Work": merge-conflict record and contribution table drafted from Jira / Git | Danylo Filatov |

<!-- Append one row per meaningful usage. Sprint-level granularity is fine. -->
