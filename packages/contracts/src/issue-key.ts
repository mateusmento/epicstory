/** Jira-style issue key: `EPIC-42` (prefix 2–10 alnum, starts with letter). */
export const ISSUE_KEY_PREFIX_MIN_LEN = 2;
export const ISSUE_KEY_PREFIX_MAX_LEN = 8;

const SINGLE_WORD_PREFIX_LEN = 3;

const KEY_TOKEN =
  /(?:^|[^A-Za-z0-9])([A-Za-z][A-Za-z0-9]{1,9})-(\d+)(?=$|[^0-9])/g;

export function formatIssueKey(prefix: string, issueNumber: number): string {
  return `${prefix}-${issueNumber}`;
}

export function parseIssueKey(
  token: string,
): { prefix: string; issueNumber: number } | null {
  const m =
    /^(?:^|[^A-Za-z0-9])([A-Za-z][A-Za-z0-9]{1,9})-(\d+)(?=$|[^0-9])/.exec(
      token.trim(),
    );
  if (!m) return null;
  const issueNumber = Number(m[2]);
  if (!Number.isFinite(issueNumber) || issueNumber < 1) return null;
  return { prefix: m[1].toUpperCase(), issueNumber };
}

/** Extract unique issue-key strings from free text (branch name, commit message). */
export function extractIssueKeysFromText(text: string): string[] {
  const found = new Set<string>();
  const s = text.trim();
  if (!s) return [];

  KEY_TOKEN.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = KEY_TOKEN.exec(s)) !== null) {
    const prefix = m[1].toUpperCase();
    const issueNumber = Number(m[2]);
    if (Number.isFinite(issueNumber) && issueNumber >= 1) {
      found.add(formatIssueKey(prefix, issueNumber));
    }
  }
  return [...found];
}

function compactProjectName(name: string): string {
  return name.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
}

function wordsFromProjectName(name: string): string[] {
  return name
    .trim()
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean);
}

function isNumericWord(word: string): boolean {
  return /^\d+$/.test(word);
}

function letterPartFromAlphaWords(alphaWords: string[]): string {
  if (alphaWords.length === 0) return "";

  if (alphaWords.length === 1) {
    const compact = compactProjectName(alphaWords[0]);
    if (compact.length >= SINGLE_WORD_PREFIX_LEN) {
      return compact.slice(0, SINGLE_WORD_PREFIX_LEN);
    }
    if (compact.length === 2) return compact;
    if (compact.length === 1) return `${compact}X`;
    return "PR";
  }

  let acronym = "";
  for (const word of alphaWords) {
    const letter = word.match(/[a-zA-Z]/)?.[0];
    if (letter) acronym += letter.toUpperCase();
    if (acronym.length >= ISSUE_KEY_PREFIX_MAX_LEN) break;
  }
  return acronym.slice(0, ISSUE_KEY_PREFIX_MAX_LEN);
}

/**
 * Short prefix suggestion from a project name (before uniqueness checks).
 *
 * - One word: first 3 letters (`Epicstory` → `EPI`).
 * - Multiple words, all alphabetic: acronym (`Epic Story` → `ES`).
 * - Name + number (`Project 1` → `PRO1`): first-3 / acronym of letter words + numeric tail.
 */
export function candidateIssueKeyPrefixFromProjectName(name: string): string {
  const words = wordsFromProjectName(name);
  if (words.length === 0) return "PRJ";

  if (words.length === 1) {
    const single = compactProjectName(words[0]);
    if (single.length >= SINGLE_WORD_PREFIX_LEN) {
      return single.slice(0, SINGLE_WORD_PREFIX_LEN);
    }
    if (single.length === 2) return single;
    if (single.length === 1) return `${single}X`;
    return "PRJ";
  }

  const alphaWords = words.filter((w) => /[a-zA-Z]/.test(w));
  const numWords = words.filter(isNumericWord);

  if (numWords.length > 0 && alphaWords.length > 0) {
    const letterPart = letterPartFromAlphaWords(alphaWords);
    const combined = `${letterPart}${numWords.join("")}`.slice(
      0,
      ISSUE_KEY_PREFIX_MAX_LEN,
    );
    if (
      combined.length >= ISSUE_KEY_PREFIX_MIN_LEN &&
      /^[A-Z]/.test(combined)
    ) {
      return combined;
    }
  }

  const acronym = letterPartFromAlphaWords(alphaWords);
  if (acronym.length >= ISSUE_KEY_PREFIX_MIN_LEN) return acronym;

  const compact = compactProjectName(name);
  if (compact.length >= ISSUE_KEY_PREFIX_MIN_LEN) {
    return compact.slice(0, ISSUE_KEY_PREFIX_MAX_LEN);
  }
  return "PRJ";
}

/** Suggest a prefix from the name; does not check workspace uniqueness. */
export function suggestIssueKeyPrefixFromProjectName(name: string): string {
  return candidateIssueKeyPrefixFromProjectName(name);
}

/**
 * Normalize user input for project key (uppercase alnum, 2–10 chars, starts with letter).
 * Returns `null` when invalid.
 */
export function normalizeProjectKeyPrefix(input: string): string | null {
  const trimmed = input
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  if (
    trimmed.length < ISSUE_KEY_PREFIX_MIN_LEN ||
    trimmed.length > ISSUE_KEY_PREFIX_MAX_LEN
  ) {
    return null;
  }
  if (!/^[A-Z][A-Z0-9]*$/.test(trimmed)) {
    return null;
  }
  return trimmed;
}

function normalizePrefixCandidate(base: string): string {
  let candidate = base.slice(0, ISSUE_KEY_PREFIX_MAX_LEN).toUpperCase();
  if (candidate.length < ISSUE_KEY_PREFIX_MIN_LEN) {
    candidate = "PRJ";
  }
  return candidate;
}

/**
 * Pick a unique prefix: try `base`, lengthen using letters from `compactName`
 * (EPI → EPIC → …), then numeric suffixes (EPIC2).
 */
export function disambiguateIssueKeyPrefix(
  base: string,
  takenUpper: ReadonlySet<string>,
  options?: { compactName?: string },
): string {
  const candidate = normalizePrefixCandidate(base);
  if (!takenUpper.has(candidate)) return candidate;

  const compact =
    options?.compactName != null && options.compactName.length > 0
      ? compactProjectName(options.compactName)
      : candidate;

  const seed =
    compact.startsWith(candidate) && compact.length > candidate.length
      ? compact
      : compact.length >= candidate.length
        ? compact
        : candidate;

  for (
    let len = candidate.length + 1;
    len <= Math.min(seed.length, ISSUE_KEY_PREFIX_MAX_LEN);
    len += 1
  ) {
    const extended = seed.slice(0, len);
    if (
      extended.length >= ISSUE_KEY_PREFIX_MIN_LEN &&
      !takenUpper.has(extended)
    ) {
      return extended;
    }
  }

  for (let n = 2; n < 1000; n += 1) {
    const suffix = String(n);
    const trimmed = candidate.slice(
      0,
      Math.max(
        ISSUE_KEY_PREFIX_MIN_LEN,
        ISSUE_KEY_PREFIX_MAX_LEN - suffix.length,
      ),
    );
    const next = `${trimmed}${suffix}`.slice(0, ISSUE_KEY_PREFIX_MAX_LEN);
    if (!takenUpper.has(next)) return next;
  }
  throw new Error("Could not allocate a unique issue key prefix");
}
