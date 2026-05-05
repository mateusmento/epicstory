import { computed } from "vue";

export type ReadonlyRef<T> = { readonly value: T };
export type ReadonlyRefOrGetter<T> = ReadonlyRef<T> | (() => T);

export function toValue<T>(value: ReadonlyRefOrGetter<T>): T {
  if (typeof value === "function") {
    return value();
  }
  return value.value;
}

export function toReadonlyRef<T>(value: ReadonlyRefOrGetter<T>): ReadonlyRef<T> {
  if (typeof value === "function") {
    return computed(value);
  }
  return value;
}
