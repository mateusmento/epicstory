import { format } from 'sql-formatter';
import { SelectQueryBuilder } from 'typeorm';

export function logQuery(qb: SelectQueryBuilder<any>, label?: string) {
  const [sql, params] = qb.getQueryAndParameters();

  let formatted = sql;

  // Replace placeholders (supports ? and $1 style)
  if (sql.includes('?')) {
    let i = 0;
    formatted = sql.replace(/\?/g, () => JSON.stringify(params[i++]));
  } else {
    params.forEach((p, i) => {
      formatted = formatted.replace(`$${i + 1}`, JSON.stringify(p));
    });
  }

  console.log(`\n=== ${label ?? 'QUERY'} ===`);
  console.log(format(formatted));
}
