# Epicstory domain glossary

Vocabulary for architecture and product conversations. Prefer these names over Nest class names when discussing seams and modules.

## Attachment

A workspace-owned uploaded file (DB row + S3 object): storage key, uploader, optional `channelId` / `issue_id`. The bytes and metadata live in the workspace **module**; chat parents do not own the blob exclusively.

See [ADR-0001](docs/adr/0001-channel-attachment-references.md).

## Attachment reference

A many-to-many join linking an Attachment to a parent: channel message, thread reply, MessageDraft, or ScheduledMessage (`scheduled_job`). Refcount for GC = join count across parents; rows with `issue_id` set are never garbage-collected. Owned by the channel **Attachment references** module (`commit` / `load`).

See [ADR-0001](docs/adr/0001-channel-attachment-references.md).

## MessageDraft

Per `(channel, author[, thread root])` in-progress TipTap document (and optional poll/quotes) with version and TTL. Attachment references on the draft hold file tiles until send, schedule, or expiry purge.

See [ADR-0002](docs/adr/0002-draft-and-scheduled-attachment-parents.md).

## ScheduledMessage

A `ScheduledJob` of type `scheduled_message`: TipTap payload + due/recurrence. Attachment references hang on the job (not inside the JSON payload) until delivery copies them onto the posted message and once-jobs release the job joins.

See [ADR-0002](docs/adr/0002-draft-and-scheduled-attachment-parents.md).
