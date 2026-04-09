export type JwtExpiresIn = string | number;

/**
 * Converts a JWT `expiresIn` value (as supported by `jsonwebtoken` / `@nestjs/jwt`)
 * into a number of seconds.
 *
 * Supported examples:
 * - `3600` (number) -> 3600
 * - `"3600"` -> 3600 (treated as seconds)
 * - `"3600s"` -> 3600
 * - `"2h"` -> 7200
 * - `"1d"` -> 86400
 * - `"500ms"` -> 0.5
 */
export function jwtExpiresInToSeconds(value: JwtExpiresIn): number {
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value < 0) {
      throw new Error(`Invalid expiresIn number: ${value}`);
    }
    return value;
  }

  const raw = value.trim().toLowerCase();
  if (!raw) throw new Error('Invalid expiresIn string: empty');

  // If config is a numeric string, treat as seconds (matching common JWT config usage).
  if (/^\d+(\.\d+)?$/.test(raw)) {
    const seconds = Number(raw);
    if (!Number.isFinite(seconds) || seconds < 0) {
      throw new Error(`Invalid expiresIn numeric string: ${value}`);
    }
    return seconds;
  }

  const match = raw.match(/^(\d+(?:\.\d+)?)(ms|s|m|h|d|w)$/);
  if (!match) {
    throw new Error(
      `Invalid expiresIn format: ${value}. Expected number (seconds) or <number><unit> (ms|s|m|h|d|w), e.g. "1d", "2h", "3600s".`,
    );
  }

  const amount = Number(match[1]);
  const unit = match[2] as 'ms' | 's' | 'm' | 'h' | 'd' | 'w';

  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error(`Invalid expiresIn amount: ${value}`);
  }

  switch (unit) {
    case 'ms':
      return amount / 1000;
    case 's':
      return amount;
    case 'm':
      return amount * 60;
    case 'h':
      return amount * 60 * 60;
    case 'd':
      return amount * 60 * 60 * 24;
    case 'w':
      return amount * 60 * 60 * 24 * 7;
  }
}
