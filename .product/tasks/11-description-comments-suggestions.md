# 11 — Issue description comments and edit suggestions

**Status:** In progress (vertical slice shipped; suggest-on-type + rich composers)  
**Session question:** Can a teammate select text in an issue description, leave a comment or suggest an edit, and review those threads in a gutter next to the description—aligned to where they selected—without hunting the Activity timeline?

**PRD:** Linear-style selection comments + edit suggestions beside the description (not in Activity timeline).

## Problem

Issue Activity comments are general discussion and do not anchor to wording in the description. Teammates cannot clarify or propose copy changes in place the way Linear does.

## User stories

- As a **reviewer**, I select a phrase in the description, leave a comment, and see the thread beside that selection.
- As a **reviewer**, I suggest replacement text for a selection and someone with edit rights can accept or reject it.
- As a **developer**, I see nearby comment cards stacked by selection start, and distant ones leave gutter whitespace at their selection Y.

## Decisions

| Decision | Rationale |
|----------|-----------|
| Threads are issue activity but **not** listed in Activity timeline | Keep description review next to the doc; Activity stays for general discussion |
| Order + Y-anchor by selection start; stack only on collision | Matches Linear; packing everything at the top is wrong |
| Separate tables from `commentChannelId` messages | Avoid conflating channel chat with description anchors |
| TipTap mark stores stable `markId` | Positions alone drift under edits |
| Suggest mode records add / delete / replace after Suggest is clicked | Matches Notion; selection is not pre-marked; caret leave commits |
| No note required to commit a suggestion | Click elsewhere / move caret commits the recording |
| Comment + reply composers use multiline `RichTextComposer` | Rich notes, not single-line plain inputs |

## Scope

### Phase 1 — Selection comments + gutter

- [x] Persist description threads + messages (API + DB)
- [x] TipTap description-thread mark + Comment action in bubble menu
- [x] Gutter beside description: Y-anchor, collision stack, gaps
- [x] Reply + resolve; highlights for open threads
- [x] Not listed in Activity timeline
- [x] Floating comment + reply use rich text composers

### Phase 2 — Edit suggestions

- [x] Suggest mode: type/backspace/replace recording
- [x] Auto-commit on caret leave; new recording at next edit site
- [x] Accept applies description patch; Reject resolves without apply
- [x] Same gutter layout rules

## Explicitly deferred

- Listing each description thread in the Activity timeline
- Replacing general Activity comments
- CRDT / multi-cursor collab
- Connector lines, mobile-first gutter polish, GitHub PR export
- Notifications for description threads
- Robust remapping under heavy concurrent edits

## Acceptance

- Select description text → Comment → floating rich composer → highlight + gutter card
- Cards ordered by selection start; nearby stack; distant leave whitespace
- Highlight ↔ card association; resolve clears open highlight
- Suggest → mode on (no pre-clone) → add/delete/replace recorded → move caret commits (no note) → Accept / Reject
- Reply uses rich text composer
- Threads do **not** appear as Activity timeline rows

## Manual test

1. Run migration `1779520000000-MigrationIssueDescriptionThreads`.
2. Open an issue → select description text → Comment → rich composer → submit → card appears in gutter at selection Y.
3. Suggest → edit (type, backspace, or replace) → click elsewhere → suggestion commits without a note.
4. Move caret and edit again → second suggestion thread.
5. Accept / Reject; reply with rich text; Activity timeline does not list these threads.
