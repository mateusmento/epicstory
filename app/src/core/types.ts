export type Page<T> = {
  content: T[];
  page: number;
  count: number;
  hasNext: boolean;
  hasPrevious: boolean;
};

export type PageQuery = {
  orderBy: string;
  order: string;
  page: number;
  count: number;
};
