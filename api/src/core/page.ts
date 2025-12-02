import { patch } from './objects';

export type PageQuery = {
  orderBy?: string;
  order?: string;
  page: number;
  count: number;
};

export class Page<T> {
  content: T[];
  page: number;
  count: number;
  hasNext: boolean;
  hasPrevious: boolean;
  total: number;

  constructor(data: Partial<Page<T>>) {
    patch(this, data);
  }

  static fromResult<T>(content: T[], total: number, query: PageQuery): Page<T> {
    return new Page({
      content,
      total,
      ...query,
      hasPrevious: query.page > 0,
      hasNext: total > query.page * query.count + content.length,
    });
  }
}
