# ADR-0002: MessageDraft and ScheduledMessage as attachment-reference parents

## Status

Accepted

## Context

Composers and scheduled sends need to hold uploads before a delivered message (or reply) row exists. With exclusive message/reply FKs, staged files had nowhere durable to hang, and TTL/expiry could not release joins so unused blobs (and S3 objects) could be cleaned up. Product requirement: the same file can be referenced by a channel draft, a scheduled job, and each delivered message, without breaking issue description media (ADR-0001).

## Decision

1. **MessageDraft** is a first-class parent: per `(channel, author[, thread root])` TipTap document with version and TTL. Attachment references use anchor `{ type: 'draft', draftId }`. Draft CRUD and expired-draft purge release those joins (then eager GC when refcount allows).

2. **ScheduledMessage** (`ScheduledJob` type `scheduled_message`) holds attachment references on the job via `{ type: 'scheduled', scheduledJobId }` — not inside the JSON payload. Create/update sync joins; list/load hydrates tiles from joins.

3. **Delivery and cleanup**
   - Live send / schedule-create clear the matching composer draft after binding the new parent (when applicable).
   - Schedule fire loads ids from the job, posts the message with `trustedDelivery`, and once-jobs `release` the scheduled anchor so template joins do not block GC (message joins remain).
   - **GC rule** (with ADR-0001): delete blob only when `issue_id` is null and join refcount is zero.

## Consequences

**Easier**

- Draft and schedule share the same reference module as messages/replies; no parallel “staging attachment” subsystem.
- Purge/reclaim can reason about drafts and jobs as ordinary anchors.

**Harder / constraints**

- Frontend dual-write of drafts, join-based tiles, and drafts UI remain product work (`.product/CURRENT.md`); this ADR only records the backend parent model.
- Media library / picking an existing workspace file, and migrating issue-description media onto joins, stay deferred.
- Callers must not stuff attachment id lists only into scheduled JSON and skip job joins.

## Alternatives considered

- **Store attachment ids only in draft/schedule payload JSON** — bypasses refcount GC and load helpers; rejected.
- **Re-upload on send/fire** — wastes storage and breaks “same file, multiple parents.”
- **Exclusive staging table unrelated to Attachment references** — duplicates ADR-0001’s graph for no gain.
