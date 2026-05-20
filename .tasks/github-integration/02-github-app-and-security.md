# 02 — GitHub App registration & security

**Prerequisites:** `01-discussion-and-decisions.md` exit criteria met.

**Locked:** **GitHub App only.** Register **one** GitHub App. Member flows use **user-to-server** authorization configured **on that app**. Do **not** register a legacy **OAuth App** under Developer settings → OAuth Apps.

## Tasks

- [ ] Create **GitHub App** under the GitHub **org** (or transitional personal account) that will own Epicstory’s integration.
- [ ] Configure **Callback URL** / **Setup URL** (and any **Redirect URLs** for **user authorization**) per environment: local, staging, production; HTTPS and reverse proxy aligned.
  - **Setup URL / post-install redirect** must match `GET …/api/integrations/github/install/callback` **on the same public host** Epicstory browsers use (`APP_URL`; override with `GITHUB_APP_INSTALL_CALLBACK_URL` if split).
- [ ] Generate and store **credentials** in secret hosting only:
  - Private key (`.pem`) or GitHub’s credential mechanism for minting JWTs
  - **Client secret** if shown for the GitHub App (used in user-to-server token exchange per GitHub docs)
- [ ] Configure **user-to-server** authorization so GitHub returns **refresh tokens** where supported (per current GitHub App docs — request type / flags evolve); Epicstory persists refresh tokens encrypted and rotates access tokens server-side (task **03**, `GITHUB_USER_SERVER_REFRESH_TOKEN_ENABLED`).
- [ ] Set **repository permissions** (Contents, Pull requests, Metadata, etc.) to the minimum agreed in task **01 §5**.
- [ ] Subscribe the app to **`pull_request`** webhooks where GitHub expects it (typically “Subscribe to events” / installation scope) so Epicstory receives **`opened`**, **`closed`**, and related lifecycle events for PR state sync per **01 §7.4** and task **06** (implementation in task **03**).
- [ ] Security review: least privilege, encrypted storage plan for **persisted user tokens**, rotation runbook for secrets/keys, audit events for connect/disconnect.

## Acceptance criteria

- Short runbook: rotate client secret / signing key without downtime where possible.
- Threat model note: stolen authorization code, leaked refresh token (if GitHub issues one), user revocation, compromised installation.

## Dependencies

- Stable callback hostnames (staging/prod).
