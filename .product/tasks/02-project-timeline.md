# 02 — Project timeline view

**Status:** Not started  
**Depends on:** Issue activity API patterns (exists on issue detail)

## Problem

`Timeline.vue` is a placeholder (“coming soon”). Teams lack a **project-level** chronological view of meaningful events (status changes, assignments, Git links, comments).

## Product questions (answer before build)

- What events belong on **project** timeline vs **issue** activity only?
- Is timeline **filterable** by member, label, Git activity?
- Real-time updates required for MVP or poll on focus?

## Scope (draft — refine in discussion)

- [ ] Define event types and API (`GET /projects/:id/timeline` or reuse feed)
- [ ] Replace placeholder with paginated list + empty state
- [ ] Link each row to issue (show **issue key** + title)
- [ ] Loading / error states per frontend-ux rule

## Deferred

- Export / RSS / notifications from timeline
- Cross-project workspace timeline

## Acceptance

- User opening Project → Timeline sees real events for last N days, not placeholder.
