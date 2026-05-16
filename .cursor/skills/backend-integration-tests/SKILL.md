---
name: backend-integration-tests
description: Runs and extends Jest integration tests for api/ using Nest TestingModule, PostgreSQL Testcontainers, migrations, and transactional context. Use when adding *.spec.ts command/query tests, debugging flaky DB tests, or seeding test data.
disable-model-invocation: true
---

# Backend integration tests (api/)

## Harness

- Prefer **`createTestingModule`** and **`startPostgresTestContainer`** from `src/core/testing/database.ts`: spins Postgres, loads TypeORM with **`synchronize: false`**, runs **migrations**, seeds baseline users used by many tests.
- Call **`initializeTransactionalContext()`** in tests that exercise `@Transactional()`—already invoked inside `createTestingModule`.

## Patterns

- Obtain **`CommandBus`** / **`QueryBus`** from the compiled module with `module.get(...)`.
- Use **`beforeAll`** for container + module startup; **`afterAll`** to close resources when tests create long-lived handles (follow neighboring specs).
- For isolation between examples, use **`truncateTables`** from the same testing helper when tests need a clean slate—pass entity classes whose tables should be cleared.

## Adding coverage

- Place specs near features (`**/__tests__/*.spec.ts`) matching existing layout.
- Prefer **integration** tests for behavior spanning persistence and handlers; unit-test pure helpers separately when cheap.

## Checklist

- [ ] New command/query test uses the shared DB bootstrap unless a lighter unit suffices.
- [ ] Migrations apply cleanly on empty DB (CI parity).
- [ ] Tests avoid depending on `synchronize`—schema must come from migrations.
