import { Transform } from 'class-transformer';

export function Trimmed() {
  return Transform(({ value }) =>
    value instanceof String ? value.trim() : value,
  );
}
