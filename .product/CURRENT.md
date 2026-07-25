# Current session

**Updated:** 2026-07-24

## Session question (60–90 min)

> Can the same uploaded file stay first-class and be referenced by a channel draft, a scheduled job, and each delivered message—while unused files (and S3 objects) are cleaned up, without breaking issue description media?

## Done when

- [x] Join tables + `message_drafts`; migrate exclusive `message_id`/`message_reply_id` into joins
- [x] Associate/detach/eager GC APIs; list via joins; S3 on GC; never GC `issue_id` rows
- [x] Wire send/reply/update + schedule create/update/delete/fire
- [x] Draft CRUD APIs + expired-draft purge + S3 orphan sweep cron
- [ ] Channel UI: dual-write drafts, tiles=joins−doc, schedule attachments, drafts drawer + badge

## Active task

→ Attachment reference redesign (backend slice largely in place; frontend remaining)

## Explicitly deferred (this session)

- Media library browser / pick existing workspace file
- Issue-description join migration (keep `issue_id`)
- CRDT / multi-cursor drafts
