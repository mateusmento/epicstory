import {
  associateEligibilityError,
  mayGarbageCollectAttachment,
} from './attachment-reference.rules';

describe('attachment-reference.rules', () => {
  const baseRow = {
    workspaceId: 1,
    channelId: 2,
    uploadedById: 3,
    issueId: null as number | null,
  };

  const baseActor = {
    workspaceId: 1,
    channelId: 2,
    uploadedById: 3,
  };

  describe('associateEligibilityError', () => {
    it('accepts a matching row', () => {
      expect(associateEligibilityError(baseRow, baseActor)).toBeNull();
    });

    it('rejects workspace mismatch', () => {
      expect(
        associateEligibilityError({ ...baseRow, workspaceId: 9 }, baseActor),
      ).toBe('workspace_mismatch');
    });

    it('rejects uploader mismatch unless trustedDelivery', () => {
      expect(
        associateEligibilityError({ ...baseRow, uploadedById: 9 }, baseActor),
      ).toBe('uploader_mismatch');
      expect(
        associateEligibilityError(
          { ...baseRow, uploadedById: 9 },
          { ...baseActor, trustedDelivery: true },
        ),
      ).toBeNull();
    });

    it('rejects issue-scoped rows without matchedIssueId', () => {
      expect(
        associateEligibilityError({ ...baseRow, issueId: 10 }, baseActor),
      ).toBe('issue_scoped');
    });

    it('allows matchedIssueId when issue matches', () => {
      expect(
        associateEligibilityError(
          { ...baseRow, issueId: 10 },
          { ...baseActor, matchedIssueId: 10 },
        ),
      ).toBeNull();
      expect(
        associateEligibilityError(
          { ...baseRow, issueId: 10 },
          { ...baseActor, matchedIssueId: 11 },
        ),
      ).toBe('issue_mismatch');
    });
  });

  describe('mayGarbageCollectAttachment', () => {
    it('allows delete only with null issue_id and no joins', () => {
      expect(
        mayGarbageCollectAttachment({ issueId: null, hasAnyJoin: false }),
      ).toBe(true);
      expect(
        mayGarbageCollectAttachment({ issueId: null, hasAnyJoin: true }),
      ).toBe(false);
      expect(
        mayGarbageCollectAttachment({ issueId: 1, hasAnyJoin: false }),
      ).toBe(false);
    });

    it('matches deleteBlobsIfStillUnreferenced predicates (issue null + zero joins)', () => {
      // AttachmentService DELETE … WHERE issue_id IS NULL AND NOT EXISTS joins
      // must stay aligned with this pure rule.
      const cases: Array<{
        issueId: number | null;
        hasAnyJoin: boolean;
        mayGc: boolean;
      }> = [
        { issueId: null, hasAnyJoin: false, mayGc: true },
        { issueId: null, hasAnyJoin: true, mayGc: false },
        { issueId: 5, hasAnyJoin: false, mayGc: false },
        { issueId: 5, hasAnyJoin: true, mayGc: false },
      ];
      for (const c of cases) {
        expect(
          mayGarbageCollectAttachment({
            issueId: c.issueId,
            hasAnyJoin: c.hasAnyJoin,
          }),
        ).toBe(c.mayGc);
      }
    });
  });
});
