# 04 — PR lifecycle comments on issues (optional)

**Status:** Deferred  
**Spec alignment:** `.tasks/github-integration/06-branches-and-pull-requests.md` (optional item)

## Problem

When a PR merges or closes on GitHub, linkage rows update via webhook, but the **issue activity feed** may not narrate the transition. Some teams want Jira-style “PR merged” notes; others only want the GitHub sidebar.

## Product questions

- Do we spam the issue feed or only update structured PR list?
- Same idempotency keys as `pr_created` comment?

## Scope (if promoted)

- [ ] On `pull_request` closed/merged webhook → optional system comment
- [ ] Idempotency: `issue_id` + `github_pull_request_id` + `merged` | `closed`
- [ ] Setting per workspace? (default off)

## Decision (current)

**Defer** — sidebar + DB state sufficient for MVP; revisit after issue key UX and timeline.
