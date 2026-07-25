# ADR-0001: Channel Attachment references (`commit` / `load`)

## Status

Accepted

## Context

Channel chat needed the same uploaded file to remain first-class across composer, schedule, and delivered message (see product session in `.product/CURRENT.md`). The previous model treated attachments as exclusively owned by a single parent via `message_id` / `message_reply_id` on the Attachment row. That could not express multi-parent lifecycle, and associate / reconcile / GC logic had sprawled inside workspace `AttachmentService` as parallel `associateTo*` clones.

Issue description media still uses `issue_id` on the Attachment row and must not be deleted by channel join GC.

## Decision

1. **Many-to-many attachment references** (join tables) link an Attachment to channel parents: message, reply, draft, or scheduled job. The blob row stays workspace-owned; parents do not own the file exclusively.

2. **Channel owns the reference graph.** External seam: `AttachmentReferencesService` with `commit` (ops: `sync`, `release`, `releaseAttachment`, `reclaim`) and `load` (plus list helpers). Anchors and actor policy (`uploadedById`, optional `trustedDelivery`, optional `matchedIssueId`) are part of that interface. Pure eligibility / GC predicates live in `api/src/channel/domain/rules/attachment-reference.rules.ts`.

3. **Workspace owns blobs and issue media.** `AttachmentService` handles upload, issue list/purge helpers, S3 orphan sweep, and narrow blob ports used by references (lock/list/bind/clear/delete). It does not orchestrate channel joins.

4. **Split maintenance jobs.** Channel reclaim cron runs `commit({ op: 'reclaim' })` for unreferenced blobs past grace. Scheduling / workspace S3 orphan sweep only removes storage objects that are already orphaned in S3 relative to DB rows — not join refcounting.

## Consequences

**Easier**

- One place to change associate eligibility, sync/release, and eager GC.
- Callers (send, reply, draft, schedule, issue comment attach) speak anchors and ops instead of cloning join SQL.
- Architecture reviews should treat “put join orchestration back on workspace AttachmentService” as contradicting this ADR.

**Harder / constraints**

- Every new channel parent that holds files must use an AttachmentAnchor and go through `commit` / `load`.
- Rows with `issue_id` set are never garbage-collected by reference reclaim; issue-description join migration remains explicitly deferred.
- Inventing a ports-and-adapters port for references before a second real adapter exists is out of scope; Nest injects the concrete service.

## Alternatives considered

- **Keep exclusive FKs on Attachment** — cannot share one file across draft → schedule → message.
- **Fat workspace `associateToMessage` / reconcile APIs** — localizes GC incorrectly and duplicates policy per parent type.
- **Abstract `IAttachmentReferences` port immediately** — rejected until a second adapter (e.g. in-memory) is real; interface remains the Nest service surface used by callers and tests (PGLite).
