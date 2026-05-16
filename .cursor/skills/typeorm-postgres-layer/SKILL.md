---
name: typeorm-postgres-layer
description: Guides TypeORM entities, repositories, PostgreSQL migrations, and transactional boundaries in api/. Use when changing schema, writing migrations, wiring repositories, or debugging query/constraint behavior.
disable-model-invocation: true
---

# TypeORM + PostgreSQL (api/)

## Data access

- Keep **repositories** under `**/infrastructure/repositories/` unless the codebase places a given feature elsewhere.
- Prefer **explicit repositories** and query builders where complex reads already live; avoid leaking `DataSource` into domain layers.

## Migrations

- Generate/run via package scripts in `api/package.json` (`migrations:generate`, `migrations:run`, `migrations:revert`) and the TypeORM config under `src/core/typeorm/`.
- Prefer **additive** migrations for production safety; plan backfills when renaming or splitting columns.
- Add or adjust **indexes** when introducing new list/filter queries—mirror existing migration naming.

## Transactions

- Use `@Transactional()` from `typeorm-transactional` on application methods that already follow this pattern (see existing commands/services). Ensure `initializeTransactionalContext()` stays wired in `main.ts` and test bootstrap (`src/core/testing/database.ts`).

## Entities

- Entity definitions belong in **domain** or **module entity folders** per existing feature layout; keep column types aligned with PostgreSQL (JSONB, timestamps, etc.) as neighboring entities do.

## Errors

- `QueryFailedError` is mapped in `GlobalExceptionFilter`—prefer **domain exceptions** for expected rule violations; reserve raw DB errors for true persistence failures and tighten messages only when product/security requires it.

## Checklist

- [ ] Schema change has a migration; local DB matches after `migrations:run`.
- [ ] Multi-write workflows share one transactional boundary when consistency demands it.
- [ ] New queries reuse indexes or add them intentionally.
