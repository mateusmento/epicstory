export type IssueDependencyEdge = {
  issueId: number;
  dependsOnIssueId: number;
};

/**
 * Returns true if adding `candidate` would create a cycle in the dependency graph.
 * Edge direction: dependent issueId → dependsOnIssueId (blocker).
 */
export function wouldCreateDependencyCycle(
  edges: IssueDependencyEdge[],
  candidate: IssueDependencyEdge,
): boolean {
  if (candidate.issueId === candidate.dependsOnIssueId) return true;

  const adjacency = new Map<number, number[]>();
  for (const edge of edges) {
    const list = adjacency.get(edge.issueId) ?? [];
    list.push(edge.dependsOnIssueId);
    adjacency.set(edge.issueId, list);
  }

  const list = adjacency.get(candidate.issueId) ?? [];
  list.push(candidate.dependsOnIssueId);
  adjacency.set(candidate.issueId, list);

  const visited = new Set<number>();
  const stack = [candidate.dependsOnIssueId];

  while (stack.length > 0) {
    const node = stack.pop()!;
    if (node === candidate.issueId) return true;
    if (visited.has(node)) continue;
    visited.add(node);
    const next = adjacency.get(node) ?? [];
    for (const child of next) {
      stack.push(child);
    }
  }

  return false;
}
