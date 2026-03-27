import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { plainToInstance, Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { patch } from 'src/core/objects';
import { Page } from 'src/core/page';
import { logQuery } from 'src/core/typeorm/logging';
import { BacklogItemRepository } from 'src/project/infrastructure/repositories';
import {
  Equal,
  ILike,
  In,
  IsNull,
  LessThan,
  LessThanOrEqual,
  MoreThan,
  MoreThanOrEqual,
  Not,
} from 'typeorm';

const operators = {
  eq: { sql: '=', findOperator: Equal },
  neq: { sql: '!=', findOperator: Not },
  gt: { sql: '>', findOperator: MoreThan },
  gte: { sql: '>=', findOperator: MoreThanOrEqual },
  lt: { sql: '<', findOperator: LessThan },
  lte: { sql: '<=', findOperator: LessThanOrEqual },
  in: { sql: 'IN', findOperator: In },
  notIn: { sql: 'NOT IN', findOperator: (value: any[]) => Not(In(value)) },
  isNull: { sql: 'IS NULL', findOperator: IsNull },
  isNotNull: { sql: 'IS NOT NULL', findOperator: () => Not(IsNull()) },
  contains: { sql: 'LIKE', findOperator: ILike },
  notContains: {
    sql: 'NOT LIKE',
    findOperator: (value: string) => Not(ILike(`%${value}%`)),
  },
  startsWith: {
    sql: 'LIKE',
    findOperator: (value: string) => ILike(`${value}%`),
  },
  endsWith: {
    sql: 'LIKE',
    findOperator: (value: string) => ILike(`%${value}`),
  },
  notStartsWith: {
    sql: 'NOT LIKE',
    findOperator: (value: string) => Not(ILike(`${value}%`)),
  },
  notEndsWith: {
    sql: 'NOT LIKE',
    findOperator: (value: string) => Not(ILike(`%${value}`)),
  },
};

const columns = [
  'title',
  'description',
  'status',
  'priority',
  'dueDate',
  'createdAt',
  'createdById',
  'workspaceId',
  'projectId',
  'parentIssueId',
  'assignees',
  'labels',
];

class BacklogItemFieldFilter {
  @IsString()
  @IsIn(columns)
  @Transform(({ value }) => value.split('.').pop() as string)
  field: string;

  // The frontend sends `filters` as a JSON string; individual `value`s may be
  // strings, numbers, or arrays (e.g. labels).
  // NOTE: With Nest ValidationPipe({ whitelist: true }), properties without
  // class-validator decorators get stripped. `@IsOptional()` ensures `value`
  // survives validation while still allowing any shape.
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    const v = value.trim();
    if (!v) return value;
    try {
      return JSON.parse(v);
    } catch {
      return value;
    }
  })
  value: any;

  @IsString()
  @IsIn(Object.keys(operators))
  operator: keyof typeof operators;
}

export class FindBacklogItems {
  backlogId?: number;

  projectId?: number;

  @IsString()
  orderBy: string;

  @IsString()
  order: 'asc' | 'desc';

  @IsNumber()
  page: number;

  @IsNumber()
  count: number;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Transform(({ value }) => {
    // When `filters` comes from querystring it is typically a JSON string.
    // We must return typed instances here; otherwise ValidationPipe whitelist
    // may strip nested objects (turning them into `{}`).
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    return plainToInstance(BacklogItemFieldFilter, parsed);
  })
  @Type(() => BacklogItemFieldFilter)
  filters?: BacklogItemFieldFilter[];

  constructor(data: Partial<FindBacklogItems> = {}) {
    patch(this, data);
  }
}

@QueryHandler(FindBacklogItems)
export class FindBacklogItemsQuery implements IQueryHandler<FindBacklogItems> {
  constructor(private backlogItemRepo: BacklogItemRepository) {}

  async execute({
    backlogId,
    projectId,
    orderBy,
    order,
    page,
    count,
    filters,
  }: FindBacklogItems) {
    const baseQb = this.backlogItemRepo
      .createQueryBuilder('item')
      .leftJoinAndSelect('item.issue', 'issue')
      .leftJoinAndSelect('issue.assignees', 'assignees')
      .leftJoinAndSelect('issue.labels', 'labels')
      .leftJoinAndSelect('issue.parentIssue', 'parentIssue');

    if (projectId)
      baseQb.andWhere('item.projectId = :projectId', { projectId });

    if (backlogId)
      baseQb.andWhere('item.backlogId = :backlogId', { backlogId });

    if (filters) {
      filters.forEach(({ field, operator, value }, idx) => {
        const param = `f_${idx}`;

        // Field/operator validation (keep backend tolerant to bad clients)
        if (field === 'dueDate') {
          if (!['gt', 'gte', 'lt', 'lte'].includes(operator)) return;
          if (!value) return;
          baseQb.andWhere(
            `issue.dueDate ${operators[operator].sql} :${param}`,
            {
              [param]: value,
            },
          );
          return;
        }

        if (field === 'status') {
          if (!['eq', 'neq'].includes(operator)) return;
          if (typeof value !== 'string' || !value.trim()) return;
          baseQb.andWhere(`issue.status ${operators[operator].sql} :${param}`, {
            [param]: value.trim(),
          });
          return;
        }

        if (field === 'priority') {
          if (!['eq', 'neq'].includes(operator)) return;
          const n = typeof value === 'number' ? value : Number(value);
          if (!Number.isFinite(n)) return;
          baseQb.andWhere(
            `issue.priority ${operators[operator].sql} :${param}`,
            {
              [param]: n,
            },
          );
          return;
        }

        if (field === 'title') {
          if (!['contains', 'notContains'].includes(operator)) return;
          if (typeof value !== 'string' || !value.trim()) return;
          const needle = `%${value.trim()}%`;
          const expr =
            operator === 'contains'
              ? `issue.title ILIKE :${param}`
              : `issue.title NOT ILIKE :${param}`;
          baseQb.andWhere(expr, { [param]: needle });
          return;
        }

        if (field === 'parentIssueId') {
          if (!['eq', 'neq'].includes(operator)) return;
          const id = typeof value === 'number' ? value : Number(value);
          if (!Number.isFinite(id)) return;
          baseQb.andWhere(
            `issue.parentIssueId ${operators[operator].sql} :${param}`,
            {
              [param]: id,
            },
          );
          return;
        }

        if (field === 'labels') {
          if (!['contains', 'notContains'].includes(operator)) return;
          const ids = (Array.isArray(value) ? value : [])
            .map((x) => (typeof x === 'number' ? x : Number(x)))
            .filter((x) => Number.isFinite(x));
          if (ids.length === 0) return;

          const sub = baseQb
            .subQuery()
            .select('1')
            .from('workspace.issue_label', 'il')
            .where('il.issue_id = issue.id')
            .andWhere(`il.label_id IN (:...${param})`)
            .getQuery();

          const expr =
            operator === 'contains' ? `EXISTS (${sub})` : `NOT EXISTS (${sub})`;
          baseQb.andWhere(expr, { [param]: ids });
          return;
        }
      });
    }

    const orderAliasMap: Record<string, [string, 'DESC' | 'ASC']> = {
      createdAt: ['issue.createdAt', 'DESC'],
      title: ['issue.title', 'ASC'],
      status: ['issue.status', 'ASC'],
      priority: ['issue.priority', 'DESC'],
      dueDate: ['issue.dueDate', 'DESC'],
      manual: ['item.order', 'ASC'],
    };

    const [orderAlias, defaultOrderDirection] = orderAliasMap[orderBy];
    const orderDirection = ['asc', 'desc'].includes(order)
      ? (order.toUpperCase() as 'ASC' | 'DESC')
      : defaultOrderDirection;

    const dataQb = baseQb
      .clone()
      .orderBy(orderAlias, orderDirection)
      .addOrderBy('item.id', 'DESC')
      .skip(page * count)
      .take(count);

    const [total, content] = await Promise.all([
      baseQb.clone().getCount(),
      dataQb.getMany(),
    ]);

    return Page.fromResult(content, total, {
      page,
      count,
      orderBy,
      order: orderDirection.toLowerCase(),
    });
  }
}
