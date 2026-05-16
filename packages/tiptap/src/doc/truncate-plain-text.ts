/**
 * Collapses horizontal whitespace and truncates with an ellipsis (Unicode …).
 * Matches backend notification excerpt truncation when using the same `max`.
 */
export function truncatePlainText(text: string, max: number): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (!t) return "";
  if (t.length <= max) return t;
  return `${t.slice(0, Math.max(0, max - 1))}…`;
}
