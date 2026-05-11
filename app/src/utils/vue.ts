import { toRef, type Ref } from "vue";

export type ReadonlyRef<T> = Readonly<Ref<T>>;
export type ReadonlyRefOrGetter<T> = ReadonlyRef<T> | (() => T);

export function toValue<T>(value: ReadonlyRefOrGetter<T>): T {
  if (typeof value === "function") {
    return value();
  }
  return value.value;
}

export function toReadonlyRef<T>(value: ReadonlyRefOrGetter<T>): ReadonlyRef<T> {
  return toRef(value);
}
