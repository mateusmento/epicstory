---
name: api-http-dtos-errors
description: Standardizes HTTP request validation, response shaping, and exception handling for NestJS controllers in api/. Use when adding DTOs, pipes, Swagger decorators, HttpException/domain errors, or adjusting GlobalExceptionFilter behavior.
disable-model-invocation: true
---

# HTTP DTOs and errors (api/)

## Validation

- Use **class-validator** / **class-transformer** consistent with existing DTOs and global validation pipe setup.
- Controllers often pass **query/command classes** straight into `QueryBus`/`CommandBus`—ensure validation decorators live on those types when they are bound from `@Body()` / `@Query()`.

## Errors

- Prefer **`HttpException`** (and subclasses) for **expected** client mistakes; use **`BadRequestException`**, **`ForbiddenException`**, **`NotFoundException`**, etc., with stable messages where the client relies on them.
- Map **domain exceptions** to HTTP inside handlers or thin mapper utilities—avoid exposing internal strings unless intentional.
- **`GlobalExceptionFilter`** logs and returns `{ statusCode, timestamp, path, method, message }`. When changing filter behavior, preserve safe responses (avoid leaking stack traces or secrets to clients).

## Swagger

- Follow existing `@nestjs/swagger` usage on controllers/DTOs when documenting new endpoints.

## Checklist

- [ ] Inputs validated at the boundary (DTO/query/command).
- [ ] Status codes match semantics (4xx vs 5xx).
- [ ] Logs remain useful without sensitive payloads.
