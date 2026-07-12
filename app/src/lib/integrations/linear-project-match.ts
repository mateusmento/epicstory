/** Normalize names for fuzzy project matching. */
export function normalizeProjectName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Score how well two project names match (0–1).
 * Exact / containment / shared tokens — good enough for import suggestions.
 */
export function scoreProjectNameSimilarity(a: string, b: string): number {
  const na = normalizeProjectName(a);
  const nb = normalizeProjectName(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  if (na.includes(nb) || nb.includes(na)) return 0.85;

  const ta = new Set(na.split(/\s+/).filter(Boolean));
  const tb = new Set(nb.split(/\s+/).filter(Boolean));
  if (!ta.size || !tb.size) return 0;

  let overlap = 0;
  for (const t of ta) {
    if (tb.has(t)) overlap += 1;
  }
  return overlap / Math.max(ta.size, tb.size);
}

export type NamedProject = { id: number; name: string };

const SUGGEST_THRESHOLD = 0.6;

/** Best Epicstory project match for a Linear project name, if above threshold. */
export function suggestEpicProjectMatch(
  linearName: string,
  epicProjects: NamedProject[],
): NamedProject | null {
  let best: NamedProject | null = null;
  let bestScore = 0;
  for (const ep of epicProjects) {
    const s = scoreProjectNameSimilarity(linearName, ep.name);
    if (s > bestScore) {
      bestScore = s;
      best = ep;
    }
  }
  if (!best || bestScore < SUGGEST_THRESHOLD) return null;
  return best;
}
