import { ValidateIf } from 'class-validator';

/**
 * Like `@IsOptional()`, ignores `undefined` but do not skip validation for `null`.
 * Useful for PATCH/update DTOs where "omitted" means "no update",
 * but you still want to reject explicit `null` inputs.
 */
export function IsUndefinedIgnored(): PropertyDecorator {
  return ValidateIf((_, v) => v !== undefined);
}
