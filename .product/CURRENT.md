# Current session

**Updated:** 2026-07-10

## Session question (60–90 min)

> Can someone insert issue badges into a channel message (paste, command, or Share), and share an issue comment as a quote-style preview that opens the issue comment in a new tab?

## Done when

- [x] Paste issue URL and command “Issue” insert inline badges; multiple per message
- [x] Fetch messages returns hydrated `referencedIssues`; badges show current key/title/status
- [x] Share issue → channel submenu → drawer Chatbox with issue node in composer
- [x] Share comment → same submenu → drawer with quote-style comment preview (issue title + excerpt)
- [x] Comment preview click opens issue in new tab with scroll-to `messageId`
- [x] Timeline renders issue badges; quote strip shows issue title + excerpt

## Active task

→ Share issue / comment to channel

## Explicitly deferred (this session)

- Websocket live update of badges while a channel is open
- Separate client-side second request to hydrate issues
- Unfurl of non-Epicstory URLs
- Auto-send on share (user always confirms in composer)
- Cross-workspace issue insert
