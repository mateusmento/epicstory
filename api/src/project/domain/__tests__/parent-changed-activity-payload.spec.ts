import {
  buildParentChangedPayload,
  collectParentIssueIdsNeedingKeys,
  enrichParentChangedPayload,
} from '../utils/parent-changed-activity-payload';

describe('parent-changed-activity-payload', () => {
  const keys = new Map<number, string>([
    [10, 'EPV1-10'],
    [12, 'EPV1-12'],
  ]);

  it('buildParentChangedPayload includes issue keys from lookup', () => {
    expect(
      buildParentChangedPayload({
        previousParentIssueId: 10,
        newParentIssueId: 12,
        keysByIssueId: keys,
      }),
    ).toEqual({
      previousParentIssueId: 10,
      newParentIssueId: 12,
      previousParentIssueKey: 'EPV1-10',
      newParentIssueKey: 'EPV1-12',
    });
  });

  it('collectParentIssueIdsNeedingKeys skips rows that already have keys', () => {
    expect(
      collectParentIssueIdsNeedingKeys([
        {
          previousParentIssueId: 10,
          newParentIssueId: 12,
        },
        {
          previousParentIssueId: 99,
          newParentIssueId: null,
          previousParentIssueKey: 'EPV1-99',
        },
      ]),
    ).toEqual([10, 12]);
  });

  it('enrichParentChangedPayload merges keys for legacy ID-only payloads', () => {
    expect(
      enrichParentChangedPayload(
        {
          previousParentIssueId: 10,
          newParentIssueId: 12,
        },
        keys,
      ),
    ).toEqual({
      previousParentIssueId: 10,
      newParentIssueId: 12,
      previousParentIssueKey: 'EPV1-10',
      newParentIssueKey: 'EPV1-12',
    });
  });

  it('enrichParentChangedPayload leaves keys null when issue row is missing', () => {
    expect(
      enrichParentChangedPayload(
        {
          previousParentIssueId: 404,
          newParentIssueId: null,
        },
        keys,
      ),
    ).toEqual({
      previousParentIssueId: 404,
      newParentIssueId: null,
      previousParentIssueKey: null,
      newParentIssueKey: null,
    });
  });
});
