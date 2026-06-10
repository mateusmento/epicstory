import type { IPage, IPageQuery } from '@epicstory/contracts';
import { patch } from './objects';

export type { IPageQuery } from '@epicstory/contracts';

/** Server-side pagination helper; implements the wire {@link IPage} envelope. */
export class Page<T> implements IPage<T> {
  content: T[];
  page: number;
  count: number;
  hasNext: boolean;
  hasPrevious: boolean;
  total: number;

  constructor(data: Partial<Page<T>>) {
    patch(this, data);
  }

  static fromResult<T>(
    content: T[],
    total: number,
    query: Pick<IPageQuery, 'page' | 'count'>,
  ): Page<T> {
    return new Page({
      content,
      total,
      page: query.page,
      count: query.count,
      hasPrevious: query.page > 0,
      hasNext: total > query.page * query.count + content.length,
    });
  }
}
