import { useStorage } from "@vueuse/core";
import type { MaybeRefOrGetter } from "vue";
import { computed, toValue } from "vue";
import { createDefaultFilter, type ProjectFilter } from "../types/project-filters.types";
import { isDate, isValid } from "date-fns";

export function useProjectFilters(projectId: MaybeRefOrGetter<number>) {
  const filtersMap = useStorage<Record<number, ProjectFilter[]>>(`backlog.filters`, [], localStorage, {
    listenToStorageChanges: true,
  });

  const filters = computed<ProjectFilter[]>({
    get: () => filtersMap.value[toValue(projectId)] ?? [],
    set: (value) => (filtersMap.value[toValue(projectId)] = value),
  });

  function setFilters(next: ProjectFilter[]) {
    filters.value = next.filter(hasValue);
  }

  function addFilter(field: ProjectFilter["field"]) {
    if (filters.value.some((f) => f.field === field)) return;
    filters.value = [...filters.value, createDefaultFilter(field)];
  }

  function removeFilter(field: ProjectFilter["field"]) {
    filters.value = filters.value.filter((f) => f.field !== field);
  }

  function updateFilter(field: ProjectFilter["field"], next: ProjectFilter) {
    const normalized = hasValue(next) ? next : null;
    const current = filters.value ?? [];
    if (!normalized) return removeFilter(field);
    filters.value = current.map((f) => (f.field === field ? normalized : f));
  }

  return {
    filters,
    setFilters,
    addFilter,
    removeFilter,
    updateFilter,
  };
}

function hasValue(f: ProjectFilter) {
  const v: ProjectFilter["value"] = f.value;
  if (f.field === "labels") return Array.isArray(v) && v.length > 0;
  if (v === null || v === undefined) return false;
  if (isDate(v)) return isValid(v);
  if (typeof v === "string") return v.trim().length > 0;
  if (typeof v === "number") return Number.isFinite(v);
  return true;
}
