import { wouldCreateDependencyCycle } from 'src/project/domain/utils/issue-dependency-cycle';

describe('wouldCreateDependencyCycle', () => {
  it('detects self-link', () => {
    expect(
      wouldCreateDependencyCycle([], { issueId: 1, dependsOnIssueId: 1 }),
    ).toBe(true);
  });

  it('detects simple cycle', () => {
    const edges = [{ issueId: 2, dependsOnIssueId: 1 }];
    expect(
      wouldCreateDependencyCycle(edges, { issueId: 1, dependsOnIssueId: 2 }),
    ).toBe(true);
  });

  it('detects transitive cycle', () => {
    const edges = [
      { issueId: 2, dependsOnIssueId: 1 },
      { issueId: 3, dependsOnIssueId: 2 },
    ];
    expect(
      wouldCreateDependencyCycle(edges, { issueId: 1, dependsOnIssueId: 3 }),
    ).toBe(true);
  });

  it('allows acyclic edge', () => {
    const edges = [{ issueId: 2, dependsOnIssueId: 1 }];
    expect(
      wouldCreateDependencyCycle(edges, { issueId: 3, dependsOnIssueId: 2 }),
    ).toBe(false);
  });
});
