import { extractIssueKeysFromText } from 'src/project/domain/issue-key';

/** Collect issue keys from a push ref + commit messages (Jira-style). */
export function collectIssueKeysFromPushPayload(params: {
  ref: string | null;
  commitMessages: string[];
}): string[] {
  const keys = new Set<string>();

  const ref = params.ref?.trim() ?? '';
  const headsPrefix = 'refs/heads/';
  const branchName = ref.startsWith(headsPrefix)
    ? ref.slice(headsPrefix.length)
    : ref;
  if (branchName) {
    for (const k of extractIssueKeysFromText(branchName)) {
      keys.add(k);
    }
  }

  for (const msg of params.commitMessages) {
    for (const k of extractIssueKeysFromText(msg)) {
      keys.add(k);
    }
  }

  return [...keys];
}

/** Legacy Epicstory branch default `{issueId}-slug` (numeric id prefix). */
export function extractLegacyIssueIdFromBranchRef(
  ref: string,
): number | undefined {
  const branch = ref.trim().replace(/^refs\/heads\//, '');
  const m = /^(\d+)-/.exec(branch);
  if (!m) return undefined;
  const n = Number(m[1]);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}
