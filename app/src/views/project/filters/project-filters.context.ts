import type { Ref } from "vue";
import { inject, provide } from "vue";
import type { ProjectFilter } from "./project-filters.types";

const KEY = Symbol("ProjectFilters");

export type ProjectFiltersContext = {
  filters: Ref<ProjectFilter[]>;
  setFilters(next: ProjectFilter[]): void;
  addFilter(field: ProjectFilter["field"]): void;
  removeFilter(field: ProjectFilter["field"]): void;
  updateFilter(field: ProjectFilter["field"], next: ProjectFilter): void;
};

export function provideProjectFilters(ctx: ProjectFiltersContext) {
  provide(KEY, ctx);
}

export function useProjectFilters() {
  const ctx = inject<ProjectFiltersContext | null>(KEY, null);
  if (!ctx) throw new Error("ProjectFiltersContext is not provided");
  return ctx;
}

