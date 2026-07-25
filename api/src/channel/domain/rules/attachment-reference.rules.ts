/** Pure eligibility / GC predicates for Attachment references. */

export type AttachmentEligibilityRow = {
  workspaceId: number;
  channelId: number | null;
  uploadedById: number;
  issueId: number | null;
};

export type AssociateActor = {
  workspaceId: number;
  channelId: number;
  uploadedById: number;
  trustedDelivery?: boolean;
  matchedIssueId?: number;
};

export type AssociateEligibilityError =
  | 'workspace_mismatch'
  | 'channel_mismatch'
  | 'uploader_mismatch'
  | 'issue_scoped'
  | 'issue_mismatch';

export function associateEligibilityError(
  row: AttachmentEligibilityRow,
  actor: AssociateActor,
): AssociateEligibilityError | null {
  if (row.workspaceId !== actor.workspaceId) return 'workspace_mismatch';
  if (row.channelId !== actor.channelId) return 'channel_mismatch';
  if (!actor.trustedDelivery && row.uploadedById !== actor.uploadedById) {
    return 'uploader_mismatch';
  }
  const issue = row.issueId;
  if (actor.matchedIssueId === undefined) {
    if (issue != null) return 'issue_scoped';
  } else if (issue != null && issue !== actor.matchedIssueId) {
    return 'issue_mismatch';
  }
  return null;
}

export function assertAssociateEligible(
  row: AttachmentEligibilityRow,
  actor: AssociateActor,
): void {
  const err = associateEligibilityError(row, actor);
  if (err == null) return;
  const messages: Record<AssociateEligibilityError, string> = {
    workspace_mismatch: 'Attachment workspace mismatch',
    channel_mismatch: 'Attachment channel mismatch',
    uploader_mismatch: 'Attachment uploader mismatch',
    issue_scoped: 'Attachment is scoped to an issue',
    issue_mismatch: 'Attachment issue mismatch',
  };
  throw new AttachmentReferenceRuleError(messages[err]);
}

export class AttachmentReferenceRuleError extends Error {
  override readonly name = 'AttachmentReferenceRuleError';

  constructor(message: string) {
    super(message);
  }
}

/** GC may delete only when issue_id is null and join refcount is zero. */
export function mayGarbageCollectAttachment(params: {
  issueId: number | null;
  hasAnyJoin: boolean;
}): boolean {
  return params.issueId == null && !params.hasAnyJoin;
}
