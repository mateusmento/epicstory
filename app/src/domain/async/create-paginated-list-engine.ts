import type { IPage } from "@epicstory/contracts";
import { debounce } from "lodash";
import { reactive } from "vue";

export type PaginatedListState<T> = {
  items: T[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  page: number;
  pageSize: number;
  query: string;
  error?: string | null;
};

export type FetchPage<T, Ctx> = (
  ctx: Ctx,
  query: string,
  page: number,
  pageSize: number,
) => Promise<IPage<T>>;

const DEFAULT_PAGE_SIZE = 20;

export type CreatePaginatedListStateDefaults = {
  pageSize?: number;
  hasMore?: boolean;
  query?: string;
};

export function createPaginatedListState<T>(
  defaults: CreatePaginatedListStateDefaults = {},
): PaginatedListState<T> {
  return reactive({
    items: [],
    loading: false,
    loadingMore: false,
    hasMore: defaults.hasMore ?? false,
    page: 0,
    pageSize: defaults.pageSize ?? DEFAULT_PAGE_SIZE,
    query: defaults.query ?? "",
    error: null,
  });
}

export function createPaginatedListEngine<T, Ctx>(deps: {
  state: PaginatedListState<T>;
  fetchPage: FetchPage<T, Ctx>;
  getItemId: (item: T) => string | number;
  searchDebounceMs?: number;
  isContextReady?: (ctx: Ctx) => boolean;
}) {
  const { state, fetchPage, getItemId, searchDebounceMs = 200, isContextReady = () => true } = deps;

  const runFirstPage = async (ctx: Ctx, q: string) => {
    if (!isContextReady(ctx)) {
      state.loading = false;
      return;
    }
    state.query = q;
    state.page = 0;
    state.hasMore = true;
    state.loading = true;
    if ("error" in state) state.error = null;
    try {
      const result = await fetchPage(ctx, q, 0, state.pageSize);
      state.items = result.content;
      state.hasMore = result.hasNext;
    } finally {
      state.loading = false;
    }
  };

  const search = debounce(runFirstPage, searchDebounceMs);

  async function reload(ctx: Ctx, q: string) {
    await runFirstPage(ctx, q);
  }

  async function loadMore(ctx: Ctx) {
    if (state.loadingMore) return;
    if (!state.hasMore) return;
    if (!isContextReady(ctx)) return;

    state.loadingMore = true;
    if ("error" in state) state.error = null;
    try {
      const next = state.page + 1;
      const result = await fetchPage(ctx, state.query, next, state.pageSize);
      const existing = new Set(state.items.map((item) => getItemId(item)));
      for (const item of result.content) {
        if (!existing.has(getItemId(item))) state.items.push(item);
      }
      state.page = next;
      state.hasMore = result.hasNext;
    } finally {
      state.loadingMore = false;
    }
  }

  return { search, reload, loadMore };
}
