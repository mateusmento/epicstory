---
name: fp-ddd-domain-design
description: Applies functional programming (railway-oriented flows, typestate), modular design (coupling/cohesion, SOLID, clean code), and DDD (domain modeling, bounded contexts, tactical patterns) when shaping domain logic and boundaries. Use when designing or refactoring domain models, APIs, application services, error handling, types for business rules, bounded contexts, or when the user mentions FP, railway-oriented programming, typestate, DDD, aggregates, or ubiquitous language.
disable-model-invocation: true
---

# Functional programming, modular design, and DDD

Align with existing project rules ([engineering-principles](../../rules/engineering-principles.mdc), [backend-architecture](../../rules/backend-architecture.mdc)): **top-down framing, thin orchestration, pure composable leaves, I/O at edges**.

## Functional programming

### Railway-oriented programming

- Model success/failure as **explicit values** (`Result`-like unions, `Either`, tagged outcomes)—not thrown control flow for domain outcomes.
- Compose steps as **pipelines**: each step returns the next carrier type; avoid deep nested `if/try` for happy-path branching.
- Keep **domain errors** typed and meaningful at boundaries; map to HTTP/UI messages only at adapters.
- Prefer **total functions** on narrowed inputs; use guards/filters earlier in the pipeline.

### Typestate

- Encode **legal transitions** in types so illegal states are **unrepresentable** (e.g. draft vs published, unpaid vs paid).
- Prefer **narrow return types** over booleans + comments (`isVerified` scattered vs `VerifiedEmail`).
- Use **phantom types / branded types** when they clarify invariants without runtime ceremony (match project conventions).

## Modularization and abstractions

### Information hiding

- Expose **narrow interfaces**; keep representation and invariants inside the module.
- Avoid leaking persistence shapes, framework types, or internal enums across boundaries.

### Coupling and cohesion

- **High cohesion**: things that change together live together.
- **Low coupling**: depend on **stable abstractions**, not concrete adapters.
- Prefer **dependency injection** and explicit ports where the codebase already does.

### Readability and clear intent

- Names reflect **ubiquitous language** and behavior, not mechanics (`calculateOrderTotal` vs `doStuff`).
- Prefer **small functions** with single responsibility; use pipelines and helpers over long procedures.

### Layers of indirection

- Add indirection **only when it buys** testability, swapping implementations, or clearer boundaries—not preemptive abstraction.
- Each layer should have a **reason to exist** (domain vs application vs infrastructure).

### Top-down and bottom-up programming

- **Top-down**: agree on use cases, boundaries, and contracts first.
- **Bottom-up**: implement as **small pure pieces** composed upward; meet in the middle with thin orchestration.

### Reusability and extensibility

- Reuse via **composition** and stable interfaces; avoid inheritance-heavy hierarchies unless the domain demands them.
- Extend with **new types/functions** rather than editing wide switches when alternatives stay simpler.

### Codebase complexity management

- **Bounded modules**, clear ownership of concepts, one obvious place per rule.
- Reduce **accidental complexity**: duplicated validation, stringly-typed state, cross-layer shortcuts.

### Clean code

- Explicit types, early returns, shallow nesting, meaningful errors.
- Match existing formatting, imports, and error-handling patterns in the repo.

### SOLID principles

- **S**ingle responsibility per module/function cluster.
- **O**pen for extension via composition; avoid fragile base-class extension.
- **L**iskov: substitutable implementations behind interfaces.
- **I**nterface segregation: small ports, not mega-context interfaces.
- **D**ependency inversion: domain/application depend on abstractions, adapters implement them.

## DDD

### Domain modeling

- Capture **ubiquitous language** in types and function names.
- Prefer **value objects** and **entities** where behavior and identity matter; keep models **consistent by construction** where practical.

### Bounded contexts

- Split models where **language and rules diverge**; integrate via **anti-corruption layers**, contracts, or events—not one mega-model.
- Respect context boundaries in APIs and packages.

### DDD patterns

- Use tactical patterns (**aggregates**, **factories**, **repositories**, **domain services**) when they simplify consistency and lifecycle—not ceremonially.
- Application services **coordinate**; domain holds **invariants and decisions**.

## DDD with functional programming

- Model **domain data** with sum types, branded primitives, and **typestate** so invalid combinations do not compile or fail fast at construction.
- Encode **business rules** as **pure functions** over domain types; compose with **railway** flows for validation and policies.
- Keep side effects (**repos, messaging, clocks**) at **outer layers**; inject or pass capabilities explicitly.

## Workflow checklist

- [ ] Name concepts with ubiquitous language; trim leaked infra terms from domain APIs.
- [ ] Prefer explicit success/error paths (railway) for non-exceptional domain outcomes.
- [ ] Strengthen types for invariants (typestate/value objects) before adding runtime branches.
- [ ] Check cohesion/coupling: does this module own one reason to change?
- [ ] Confirm bounded-context fit: same language and lifecycle, or split/integration boundary?
