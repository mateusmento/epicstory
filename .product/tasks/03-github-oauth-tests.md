# 03 — GitHub OAuth `state` and callback tests

**Status:** Not started  
**Spec alignment:** `.tasks/github-integration/03-backend-github-auth-and-tokens.md`

## Problem

OAuth flows are security-sensitive; regressions on `state` validation or duplicate callbacks can break installs or leak sessions. Acceptance tests are listed in task 03 but not in repo.

## Scope

- [ ] Unit/integration tests: invalid `state` rejected
- [ ] Duplicate callback idempotent or safe error
- [ ] Document how to run tests in CI (api package)

## Out of scope

- E2E against real GitHub (use mocks/fixtures)

## Acceptance

- CI runs new tests; failures block merge for OAuth touch areas.
