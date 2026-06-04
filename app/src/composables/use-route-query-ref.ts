import { computed, onMounted, type ComputedRef, type Ref } from "vue";
import { useRoute, useRouter, type LocationQueryValue } from "vue-router";

export type RouteQueryRaw = LocationQueryValue | LocationQueryValue[] | undefined;

export type UseRouteQueryRefOptions<T> = {
  /** Query param name (e.g. `view`). */
  key: string;
  defaultValue: T;
  /**
   * Maps the raw query value to `T`. When omitted, uses a built-in parser for string / number /
   * boolean `defaultValue` types; other types require an explicit `parse`.
   */
  parse?: (raw: RouteQueryRaw) => T;
  /**
   * Serializes `T` for the query string. Default keeps every value (including `defaultValue`) in the URL.
   * Return `undefined`, `null`, or `""` only when you explicitly want to remove the param.
   */
  serialize?: (value: T) => string | null | undefined;
  /** If false, invalid values are parsed but the URL is left unchanged. Default: true. */
  replaceOnInvalid?: boolean;
  isValid?: (raw: RouteQueryRaw) => boolean;
};

function firstQueryValue(raw: RouteQueryRaw): LocationQueryValue | undefined {
  return Array.isArray(raw) ? raw[0] : raw;
}

function isQueryValuePresent(raw: RouteQueryRaw): boolean {
  const v = firstQueryValue(raw);
  return v != null && v !== "";
}

function defaultParse<T>(raw: RouteQueryRaw, defaultValue: T): T {
  if (!isQueryValuePresent(raw)) return defaultValue;
  const v = firstQueryValue(raw)!;
  if (typeof defaultValue === "string") return v as T;
  if (typeof defaultValue === "number") {
    const n = Number(v);
    return (Number.isFinite(n) ? n : defaultValue) as T;
  }
  if (typeof defaultValue === "boolean") {
    return (v === "true" || v === "1") as T;
  }
  return defaultValue;
}

/**
 * Two-way binding between a value and a single vue-router query param.
 *
 * VueUse provides {@link https://vueuse.org/router/useRouteQuery/ useRouteQuery} in the
 * optional `@vueuse/router` package; this project uses a small local helper instead.
 */
export function useRouteQueryRef<T>(options: UseRouteQueryRefOptions<T>): Ref<T> {
  const route = useRoute();
  const router = useRouter();
  const replaceOnInvalid = options.replaceOnInvalid ?? true;

  function parseValue(raw: RouteQueryRaw): T {
    return options.parse ? options.parse(raw) : defaultParse(raw, options.defaultValue);
  }

  function writeQuery(value: T) {
    const query = { ...route.query };
    const serialized = (options.serialize ?? defaultSerialize)(value);
    if (serialized == null || serialized === "") {
      delete query[options.key];
    } else {
      query[options.key] = serialized;
    }
    router.replace({ path: route.path, query });
  }

  function defaultSerialize(value: T): string {
    return String(value);
  }

  const state = computed({
    get: () => parseValue(route.query[options.key]),
    set: (value: T) => {
      if (Object.is(parseValue(route.query[options.key]), value)) return;
      writeQuery(value);
    },
  }) as ComputedRef<T>;

  onMounted(() => {
    const raw = route.query[options.key];
    if (!options.isValid) return;
    if (isQueryValuePresent(raw) && !options.isValid(raw)) {
      if (replaceOnInvalid) writeQuery(options.defaultValue);
    }
  });

  return state;
}
