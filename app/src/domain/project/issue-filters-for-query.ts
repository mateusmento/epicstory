import type { IssueFilter } from "@epicstory/contracts";
import { isDate, isValid } from "date-fns";

export function issueFilterHasValue(f: IssueFilter): boolean {
  const v = f.value;
  if (f.field === "labels") return Array.isArray(v) && v.length > 0;
  if (v === null || v === undefined) return false;
  if (isDate(v)) return isValid(v);
  if (typeof v === "string") return v.trim().length > 0;
  if (typeof v === "number") return Number.isFinite(v);
  return true;
}

function serializeFilterValue(f: IssueFilter): unknown {
  if (f.field === "dueDate") {
    const v = f.value;
    if (isDate(v)) return v.toISOString();
    return v;
  }

  if (f.field === "labels") {
    return (Array.isArray(f.value) ? f.value : [])
      .map((x) => (typeof x === "number" ? x : Number(x)))
      .filter((x) => Number.isFinite(x));
  }

  return f.value;
}

/** Serialize IssueFilter values for HTTP (e.g. Date → ISO). Shape is still IssueFilter. */
export function issueFiltersForQuery(filters: IssueFilter[]): IssueFilter[] {
  return filters.filter(issueFilterHasValue).map((f) => ({
    field: f.field,
    operator: f.operator,
    value: serializeFilterValue(f),
  }));
}
