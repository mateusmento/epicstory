/**
 * Derives 1–2 character initials from a display name.
 * - Two or more words: first letter of the first word + first letter of the last word.
 * - One word: up to two letters from that word (e.g. "John" → "JO").
 * - Empty / unusable: "?".
 */
export function userInitialsFromName(name: string | null | undefined): string {
  const trimmed = name?.trim() ?? "";
  if (!trimmed) return "?";

  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const a = parts[0]!.charAt(0);
    const b = parts[parts.length - 1]!.charAt(0);
    return `${a}${b}`.toUpperCase();
  }

  const word = parts[0] ?? trimmed;
  if (word.length >= 2) return word.slice(0, 2).toUpperCase();
  return word.charAt(0).toUpperCase() || "?";
}
