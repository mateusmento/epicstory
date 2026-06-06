# 07 — Adopt `UserAvatarStack` for stacked avatars

**Status:** Not started  
**Epic:** EPV1-98 (overflow container)  
**Session question:** Do stacked participant/assignee faces collapse consistently in narrow layouts instead of clipping or wrapping ad hoc?

## Problem

Several surfaces still render multiple `UserAvatar` components in a row with hand-rolled overlap (`-space-x-*`, `-ml-*`, `slice(0, 4)`, custom `+N` badges). `UserAvatarStack` + `OverflowContainer` already handle overlap, truncation, and overflow badges for backlog, board, and issue assignees.

## Already migrated (no task)

- [x] `app/src/views/project/backlog/BacklogItemRow.vue` — assignees
- [x] `app/src/views/project/board/IssueCard.vue` — assignees
- [x] `app/src/views/issue/IssueView.vue` — assignees
- [x] `app/src/views/issue/sub-issues/SubIssueRow.vue` — assignees
- [x] `app/src/components/channel/Chatbox.vue` — online users header
- [x] `app/src/components/app-pane/channels/CreateChannel.vue` — member picker trigger

## Per-location slices (~30–45 min each)

### 1. Channel activity — meeting join button

**File:** `app/src/components/channel/ChannelActivityRow.vue` (lines ~103–110)

**Today:** `UserAvatar` × `meetingAttendees.slice(0, 4)` inside `flex -space-x-1.5` on the “Join meeting” button.

**Done when:**

- [ ] Replace with `UserAvatarStack` using mapped users from `activity.meeting?.attendeeNames` (`{ id: index, name }` — names-only payload today).
- [ ] Preserve `size="base"` and `avatar-class="ring-2 ring-background"`.
- [ ] Stack truncates with `+N` when button width is tight (no hard cap at 4).

**Notes:** `attendeeNames` is `string[]` in contracts; no pictures until API adds them.

---

### 2. Navbar — live scheduled meeting card

**File:** `app/src/components/navbar/LiveMeetingJoinCard.vue` (lines ~20–29)

**Today:** `UserAvatar` × `people.slice(0, 4)` with `variant="liveJoin"`, parent passes capped list from `WorkspaceNavbar.vue`.

**Done when:**

- [ ] Replace inner stack with `UserAvatarStack` (`users={people}`, `size="md"`, `variant="liveJoin"`).
- [ ] Pass full `participantsPreview` from `WorkspaceNavbar.vue`; remove `.slice(0, 4)` at call site.
- [ ] Remove manual `-space-x-2` wrapper.

---

### 3. Navbar — in-call / incoming meeting controls

**File:** `app/src/components/navbar/CurrentMeetingControlsCard.vue` (lines ~60–76)

**Today:** Up to 4 avatars via `take(uniqBy(candidates), 4)` plus a separate `+N` circle when `candidates.length > 4`.

**Done when:**

- [ ] Replace with `UserAvatarStack` over full `candidates` list (deduped, me + attendees).
- [ ] Preserve `size="3xl"` and `variant="meetingNavbar"`.
- [ ] Remove bespoke `+{{ candidates.length - 4 }}` badge (stack ellipsis handles it).

---

### 4. Message thread — reply preview faces

**File:** `app/src/components/messages/MessageBox.vue` (lines ~179–186)

**Today:** `UserAvatar` per `message.repliers` with `-ml-2 first:ml-0` inside the replies button.

**Done when:**

- [ ] Map `repliers` → `{ id, name, picture }[]` and render `UserAvatarStack`.
- [ ] Keep replies count label beside the stack; tune `overlap-px` / `min` for inline button layout.
- [ ] Verify narrow message column: stack collapses without overlapping the “N replies” label.

---

### 5. Channel intro — member faces hero

**File:** `app/src/components/channel/Chatbox.vue` (lines ~419–426)

**Today:** `UserAvatar` × `channel.peers` with `size="tileXl"` and `-ml-10 first:ml-0`.

**Done when:**

- [ ] Replace with `UserAvatarStack` (`users={channel.peers}`, `size="tileXl"`, generous overlap via `overlap-px`).
- [ ] Intro row respects container width when many peers exist.
- [ ] Text line below (“beginning of a conversation…”) unchanged.

---

### 6. New issue modal — assignee badge trigger

**File:** `app/src/views/project/NewIssueModal.vue` (lines ~215–223)

**Today:** `UserAvatar` × `selectedAssignees` with `size="xs"` and `ml-[-0.45rem]` overlap in the assignee menu button.

**Done when:**

- [ ] Replace with `UserAvatarStack` inside the assignee `Button` trigger.
- [ ] Preserve `size="xs"`; match compact overlap for badge-sized control.
- [ ] Empty state (person icon) unchanged when no assignees selected.

## Explicitly out of scope (not stacked avatars)

| File | Why skip |
|------|----------|
| `MeetingLobby.vue` | Avatar + name chips in a wrap grid, not a stack |
| `CreateChannel.vue` member chips | Named removable chips; stack only on dropdown trigger |
| `CalendarItemDialog.vue` | Participant list rows with name + email |
| `IssueActivitySection.vue` | Single actor avatar per activity line |
| `IssueAssignedNotification.vue` | Single issuer avatar |

## Decisions

| Decision | Rationale |
|----------|-----------|
| One PR per location (or pair navbar cards) | Easier review; dogfood each surface |
| Prefer passing full user lists into stack | Let overflow logic choose visible count, not `slice(0, 4)` at parent |

## Acceptance

- No remaining `UserAvatar` + `v-for` overlap patterns in the six files above (grep `/v-for[\s\S]*UserAvatar/` clean for those paths).
- Resize each surface (backlog-width, navbar, message column, channel intro): faces collapse with `+N` instead of clipping or wrapping mid-stack.
