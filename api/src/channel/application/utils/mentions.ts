import type { User } from 'src/auth';

export function extractMentionIds(content: string): number[] {
  const matches = content.match(/@(\d+)/g);
  if (!matches) return [];

  return Array.from(
    new Set(
      matches
        .map((m) => Number(m.slice(1)))
        .filter((id) => Number.isFinite(id)),
    ),
  );
}

export function renderMentions(
  content: string,
  usersById: Map<number, User>,
): string {
  return content.replace(/@(\d+)/g, (_, rawId: string) => {
    const id = Number(rawId);
    const user = usersById.get(id);
    if (!user) return `@${rawId}`;
    return `@${user.name}`;
  });
}
