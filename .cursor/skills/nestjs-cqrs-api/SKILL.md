---
name: nestjs-cqrs-api
description: Shapes NestJS HTTP APIs using CQRS command/query buses, thin controllers, and feature modules matching api/src. Use when adding or refactoring controllers, commands, queries, handlers, or module wiring in api/.
disable-model-invocation: true
---

# NestJS + CQRS (api/)

Align with [backend-architecture](../../rules/backend-architecture.mdc): **thin HTTP layer**, orchestration via buses, domain logic in handlers and domain services.

## Layout conventions

- **Controllers** (`**/application/controllers/`): route definitions, guards/pipes, **`CommandBus` / `QueryBus` only**—delegate to commands/queries; avoid ad hoc repository calls unless the codebase already does for that endpoint.
- **Features** (`**/application/features/`): one **command** or **query** class per file (`*.command.ts`, `*.query.ts`) plus handler(s); export barrels (`features/index.ts`) where the module already uses them.
- **Handlers**: implement `ICommandHandler` / `IQueryHandler`; inject repositories/gateways/services declared in the same bounded module.
- **Domain** (`**/domain/`): entities, value objects, domain exceptions, domain services—**no** Nest imports.
- **Infrastructure** (`**/infrastructure/`): TypeORM repositories, external adapters.

## Commands vs queries

- **Commands**: mutate state, enforce authorization/preconditions, emit events if the feature uses the event bus—keep side effects obvious.
- **Queries**: read-only; return DTOs or domain-shaped data mapped before the HTTP edge when needed.

## Modules

- Register command/query **handlers** in the owning Nest module’s `providers` (follow existing module patterns).
- Prefer **feature-local** providers over new globals unless shared across modules.

## Checklist

- [ ] Controller method only builds the command/query payload and calls `execute`.
- [ ] Handler owns the use-case steps; extract pure helpers when rules grow.
- [ ] New behavior lives next to sibling features (same bounded folder).
