---
name: nestjs-auth-guards
description: Applies JWT authentication patterns with JwtAuthGuard, Auth param decorator, and Issuer typing for NestJS controllers in api/. Use when securing endpoints, threading issuer identity into commands/queries, or reviewing auth gaps.
disable-model-invocation: true
---

# Auth guards and issuer (api/)

## HTTP authentication

- Protect routes with **`@UseGuards(JwtAuthGuard)`** where private APIs require login (match sibling controllers).
- Read the current user with **`@Auth() issuer: Issuer`** (`Issuer` from `src/core/auth/auth-user.ts`: `id`, `name`, `email`).
- Pass **`issuer`** (or `issuer.id`) into commands/queries so authorization and auditing stay in handlers/domain—not in controllers beyond wiring.

## Commands and queries

- Include **`issuerId`** / **`issuer`** fields on payloads consistently with existing features in the same bounded context.
- Enforce **workspace/channel/project membership** in handlers or domain policies using injected repositories—avoid duplicating checks across many controllers.

## Exceptions

- Use **`UnauthorizedException`** / **`ForbiddenException`** aligned with Nest patterns when credentials or membership fail.

## Checklist

- [ ] Public vs private routes match product intent; default sensitive routes to guarded.
- [ ] Issuer identity propagates into the use case payload.
- [ ] Authorization logic centralized (handler/domain), not scattered duplicate checks.
