# 06 — GitHub integration manual smoke checklist

**Status:** Ongoing  
**Spec alignment:** `.tasks/github-integration/04-frontend-integration-page.md`

## Problem

GitHub App setup is environment-specific (callback URLs, ngrok, secrets). We need a repeatable **human** checklist so releases do not regress install → link → branch → PR → webhook.

## Checklist (per environment)

### Workspace admin

- [ ] Install GitHub App on workspace (Integrations → GitHub)
- [ ] Repo appears in catalogue after install

### Member

- [ ] Link GitHub user (user-to-server OAuth)
- [ ] Re-link flow after token expiry (if testable)

### Issue workflow

- [ ] Copy **issue key** from issue detail
- [ ] Create branch from issue dialog (`{key}-slug`)
- [ ] Push branch with key in name → **linked branches** appears
- [ ] Open PR from linked branch → PR in sidebar + timeline note
- [ ] Merge PR on GitHub → sidebar state updates (webhook or reconcile)

### Failure paths

- [ ] Member without link sees reconnect CTA, not 500
- [ ] Duplicate branch name returns clear error

## Notes

Record environment (local/staging/prod), ngrok URL, and GitHub App id in `.product/local/` when testing—do not commit secrets.
