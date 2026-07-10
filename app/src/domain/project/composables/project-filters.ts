import type { IssueFilter } from "@epicstory/contracts";
import { useStorage } from "@vueuse/core";
import type { MaybeRefOrGetter } from "vue";
import { computed, toValue } from "vue";
import { createDefaultFilter } from "../issue-filter-ui";
import { issueFilterHasValue } from "../issue-filters-for-query";

export function useProjectFilters(projectId: MaybeRefOrGetter<number>) {
  const filtersMap = useStorage<Record<number, IssueFilter[]>>(`backlog.filters`, [], localStorage, {
    listenToStorageChanges: true,
  });

  const filters = computed<IssueFilter[]>({
    get: () => filtersMap.value[toValue(projectId)] ?? [],
    set: (value) => (filtersMap.value[toValue(projectId)] = value),
  });

  function setFilters(next: IssueFilter[]) {
    filters.value = next.filter(issueFilterHasValue);
  }

  function addFilter(field: IssueFilter["field"]) {
    if (filters.value.some((f) => f.field === field)) return;
    filters.value = [...filters.value, createDefaultFilter(field)];
  }

  function removeFilter(field: IssueFilter["field"]) {
    filters.value = filters.value.filter((f) => f.field !== field);
  }

  function updateFilter(field: IssueFilter["field"], next: IssueFilter) {
    const current = filters.value ?? [];
    if (!current.some((f) => f.field === field)) return;
    // Keep draft chips (no value yet) so changing operator before picking a value
    // does not remove the filter. Empty filters are still omitted from queries.
    filters.value = current.map((f) => (f.field === field ? next : f));
  }

  return {
    filters,
    setFilters,
    addFilter,
    removeFilter,
    updateFilter,
  };
}
