/** Pagination envelope returned by many list endpoints. */
export type IPage<T> = {
  content: T[];
  page: number;
  count: number;
  hasNext: boolean;
  hasPrevious: boolean;
  total: number;
};

export type IPageQuery = {
  orderBy?: string;
  order?: string;
  page: number;
  count: number;
};
