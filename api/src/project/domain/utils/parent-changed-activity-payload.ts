import type { ParentChangedPayload } from '../types/issue-activity-payload.types';

export type ParentIssueKeyLookup = ReadonlyMap<number, string>;

export function issueKeyForParentId(
  lookup: ParentIssueKeyLookup,
  id: number | null | undefined,
): string | null {
  if (id == null) return null;
  const key = lookup.get(id)?.trim();
  return key || null;
}

export function buildParentChangedPayload(params: {
  previousParentIssueId: number | null;
  newParentIssueId: number | null;
  keysByIssueId: ParentIssueKeyLookup;
}): ParentChangedPayload {
  return {
    previousParentIssueId: params.previousParentIssueId,
    newParentIssueId: params.newParentIssueId,
    previousParentIssueKey: issueKeyForParentId(
      params.keysByIssueId,
      params.previousParentIssueId,
    ),
    newParentIssueKey: issueKeyForParentId(
      params.keysByIssueId,
      params.newParentIssueId,
    ),
  };
}

export function collectParentIssueIdsNeedingKeys(
  payloads: Array<ParentChangedPayload | null | undefined>,
): number[] {
  const ids = new Set<number>();
  for (const payload of payloads) {
    if (!payload) continue;
    if (
      payload.previousParentIssueId != null &&
      !payload.previousParentIssueKey?.trim()
    ) {
      ids.add(payload.previousParentIssueId);
    }
    if (
      payload.newParentIssueId != null &&
      !payload.newParentIssueKey?.trim()
    ) {
      ids.add(payload.newParentIssueId);
    }
  }
  return [...ids];
}

export function enrichParentChangedPayload(
  payload: ParentChangedPayload,
  keysByIssueId: ParentIssueKeyLookup,
): ParentChangedPayload {
  return {
    ...payload,
    previousParentIssueKey:
      payload.previousParentIssueKey?.trim() ||
      issueKeyForParentId(keysByIssueId, payload.previousParentIssueId),
    newParentIssueKey:
      payload.newParentIssueKey?.trim() ||
      issueKeyForParentId(keysByIssueId, payload.newParentIssueId),
  };
}
