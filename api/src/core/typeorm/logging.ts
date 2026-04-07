import { format } from 'sql-formatter';
import { SelectQueryBuilder } from 'typeorm';

export function logQuery(qb: SelectQueryBuilder<any>, label?: string) {
  const [sql, params] = qb.getQueryAndParameters();

  let formatted = sql;

  // Replace placeholders (supports ? and $1 style)
  if (sql.includes('?')) {
    let i = 0;
    formatted = sql.replace(/\?/g, () => stringifyJSON(params[i++]));
  } else {
    params.forEach((p, i) => {
      formatted = formatted.replaceAll(
        new RegExp(`\\$${i + 1}`, 'g'),
        stringifyJSON(p),
      );
    });
  }

  console.log(`\n=== ${label ?? 'QUERY'} ===`);
  console.log(format(formatted, { language: 'postgresql' }));
}

function stringifyJSON(value: any) {
  // output strings with single quote instead of double quotes
  const output = JSON.stringify(value);
  if (output.startsWith('"') && output.endsWith('"'))
    return `'${output.slice(1, -1)}'`;
  return output;
}
