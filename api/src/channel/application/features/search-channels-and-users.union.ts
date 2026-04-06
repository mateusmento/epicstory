import type { EntityManager } from 'typeorm';

/** Row shape returned by the channels ∪ workspace-members union (before hydration). */
export type SearchUnionRow = {
  ref_id: string | number;
  kind: string | number;
  sort_key: string;
};

const UNION_KIND_CHANNEL = 0;
const UNION_KIND_USER = 1;

export const searchUnionKind = {
  channel: UNION_KIND_CHANNEL,
  user: UNION_KIND_USER,
} as const;

/**
 * Shifts `$1..$n` in the second SQL fragment so both halves of a UNION can share one parameter array.
 */
export function offsetPostgresPlaceholders(
  sql: string,
  offset: number,
): string {
  if (offset === 0) return sql;
  const nums = new Set<number>();
  for (const m of sql.matchAll(/\$(\d+)/g)) nums.add(parseInt(m[1], 10));
  let result = sql;
  for (const n of [...nums].sort((a, b) => b - a)) {
    result = result.replace(
      new RegExp(`\\$${n}(?!\\d)`, 'g'),
      `$${n + offset}`,
    );
  }
  return result;
}

type SqlWithParams = readonly [sql: string, params: unknown[]];

/**
 * Builds `(channelSelect) UNION ALL (userSelect)` with merged positional parameters.
 */
export function mergeUnionFragments(
  channel: SqlWithParams,
  user: SqlWithParams,
): { unionSql: string; params: unknown[] } {
  const [channelSql, channelParams] = channel;
  const [userSqlRaw, userParams] = user;
  const userSql = offsetPostgresPlaceholders(userSqlRaw, channelParams.length);
  return {
    unionSql: `(${channelSql}) UNION ALL (${userSql})`,
    params: [...channelParams, ...userParams],
  };
}

export type PagedUnionResult = {
  total: number;
  rows: SearchUnionRow[];
};

/**
 * Runs COUNT(*) and a page of rows over a union subquery; LIMIT/OFFSET are inlined as safe integers.
 */
export async function executeUnionCountAndPage(
  manager: EntityManager,
  unionSql: string,
  unionParams: unknown[],
  limit: number,
  offset: number,
): Promise<PagedUnionResult> {
  const lim = Math.min(50, Math.max(1, Math.floor(Number(limit))));
  const off = Math.max(0, Math.floor(Number(offset)));

  const countSql = `SELECT CAST(COUNT(*) AS INTEGER) AS cnt FROM (${unionSql}) AS unioned`;
  const [countRaw] = (await manager.query(countSql, unionParams)) as [
    { cnt: string | number },
  ];

  const pageSql = `SELECT * FROM (${unionSql}) AS unioned ORDER BY unioned.kind ASC, unioned.sort_key ASC, unioned.ref_id ASC LIMIT ${lim} OFFSET ${off}`;
  const rows = (await manager.query(pageSql, unionParams)) as SearchUnionRow[];

  return {
    total: Number(countRaw?.cnt ?? 0),
    rows,
  };
}
