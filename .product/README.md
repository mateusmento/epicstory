# Epicstory — product focus

Epicstory is a **workspace for software teams** that combines **issue tracking**, **communication**, and **developer workflows** (especially Git). The product should feel native to people who live in Git, PRs, and branches—not like paperwork bolted onto chat.

## Problems we solve (north star)

| Problem | Who feels it | Epicstory direction |
|--------|----------------|---------------------|
| **Work is disconnected from code** | Developers | Issues link to branches/PRs; keys in branch names and commits; status visible where you plan work |
| **Context is scattered** | ICs, leads | Issue as hub: description, activity, assignees, labels, sub-issues, attachments—not yet full timeline |
| **Tooling overhead** | Small teams | Opinionated defaults, minimal setup (GitHub App), fast create/update on board and backlog |
| **“What is this issue?”** | Everyone | Stable **issue keys** (Jira-style), visible everywhere, copyable for Git and standup |

## What we are not (yet)

- Generic enterprise PM (custom fields matrix, portfolio planning).
- Replacement for GitHub (source of truth for code stays on GitHub).
- Real-time chat-first product (chat/commands are **follow-ups**, not MVP blockers).

## Personas (MVP)

1. **Developer** — moves issues, links branch/PR, needs key + Git hints without opening settings.
2. **Tech lead / admin** — connects GitHub App, manages workspace members.
3. **Teammate** — assigns, labels, comments; may not use Git integration.

## Scope pillars (build order intuition)

1. **Issues that make sense** — keys, board, backlog, issue detail, activity.
2. **Git correlation** — installation, user link, branches, PRs, webhooks (in progress).
3. **Communication** — comments/activity today; project timeline and richer feed later.
4. **Speed of capture** — create issue, keyboard/palette later.

## Where work is tracked

| Location | Purpose |
|----------|---------|
| [CURRENT.md](./CURRENT.md) | Active session question + done-when |
| [tasks/](./tasks/) | Product/engineering slices (backlog) |
| [.tasks/github-integration/](../.tasks/github-integration/) | GitHub integration deep spec |
| [.product/local/](./local/) | Personal scratch (gitignored) |

## Keeping this honest

When code ships, update the matching **task file** and **CURRENT.md**. Stale docs erode trust in the guidance process.
