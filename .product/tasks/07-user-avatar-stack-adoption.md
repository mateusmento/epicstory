# 07 — Adopt `UserAvatarStack` for stacked avatars

**Status:** Done  
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

**File:** `app/src/presentationals/channel/ChannelActivityRow.vue`

**Done when:**

- [x] Replace with `UserAvatarStack` using `meetingAttendees` from parent.
- [x] Preserve `size="base"` and `avatar-class="ring-2 ring-background"`.
- [x] Stack truncates with `+N` when button width is tight (no hard cap at 4).

---

### 2. Navbar — live scheduled meeting card

**File:** `app/src/presentationals/navbar/LiveMeetingJoinCard.vue`

**Done when:**

- [x] Replace inner stack with `UserAvatarStack` (`users={people}`, `size="md"`, `variant="liveJoin"`).
- [x] Pass full `participantsPreview` from `WorkspaceNavbar.vue`; remove `.slice(0, 4)` at call site.
- [x] Remove manual `-space-x-2` wrapper.

---

### 3. Navbar — in-call / incoming meeting controls

**File:** `app/src/containers/navbar/CurrentMeetingControlsCard.vue`

**Done when:**

- [x] Replace with `UserAvatarStack` over full `candidates` list (deduped, me + attendees).
- [x] Preserve `size="3xl"` and `variant="meetingNavbar"`.
- [x] Remove bespoke `+{{ candidates.length - 4 }}` badge (stack ellipsis handles it).

---

### 4. Message thread — reply preview faces

**File:** `app/src/presentationals/messages/MessageBox.vue`

**Done when:**

- [x] Map `repliers` → `{ id, name, picture }[]` and render `UserAvatarStack`.
- [x] Keep replies count label beside the stack; tune `overlap-px` / `min` for inline button layout.
- [x] Verify narrow message column: stack collapses without overlapping the “N replies” label.

---

### 5. Channel intro — member faces hero

**File:** `app/src/presentationals/channel/ChatboxIntro.vue`

**Done when:**

- [x] Replace with `UserAvatarStack` (`users={channel.peers}`, `size="tileXl"`, generous overlap via `overlap-px`).
- [x] Intro row respects container width when many peers exist.
- [x] Text line below (“beginning of a conversation…”) unchanged.

---

### 6. New issue modal — assignee badge trigger

**File:** `app/src/containers/views/project/NewIssueModal.vue`

**Done when:**

- [x] Replace with `UserAvatarStack` inside the assignee `Button` trigger.
- [x] Preserve `size="xs"`; match compact overlap for badge-sized control.
- [x] Empty state (person icon) unchanged when no assignees selected.

## Explicitly out of scope (not stacked avatars)

| File | Why skip |
|------|----------|
| `MeetingLobby.vue` | Removed — was avatar + name chips in a wrap grid |
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

- No remaining `UserAvatar` + `v-for` overlap patterns in the six files above.
- Resize each surface (backlog-width, navbar, message column, channel intro): faces collapse with `+N` instead of clipping or wrapping mid-stack.
