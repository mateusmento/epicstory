import { faker } from '@faker-js/faker';
import { User } from 'src/auth/domain/entities/user.entity';
import { Page } from 'src/core/page';
import { WorkspaceMember } from 'src/workspace/domain/entities';
import { WorkspaceRole } from 'src/workspace/domain/values/workspace-role.value';

/**
 * When `EPICSTORY_APPEND_FAKE_WORKSPACE_MEMBERS` is a positive integer, that many synthetic
 * {@link WorkspaceMember} rows (with nested {@link User}) are appended to each page result.
 * Uses negative ids so they cannot collide with persisted rows.
 *
 * Opt-in only — unset or `0` leaves the repository page unchanged.
 */
const ENV_KEY = 'EPICSTORY_APPEND_FAKE_WORKSPACE_MEMBERS';
const MAX_APPEND = 500;

export function appendFakeWorkspaceMembersPage(
  page: Page<WorkspaceMember>,
  workspaceId: number,
): Page<WorkspaceMember> {
  const parsed = parseInt(process.env[ENV_KEY] ?? '', 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return page;
  }

  const n = Math.min(Math.floor(parsed), MAX_APPEND);
  const fakes: WorkspaceMember[] = [];

  for (let i = 0; i < n; i++) {
    const seed =
      workspaceId * 1_000_003 + page.page * 17_771 + page.count * 97 + i;
    faker.seed(seed);

    const user = User.fromOAuth({
      name: faker.person.fullName(),
      email: faker.internet.email().toLowerCase(),
      picture: undefined,
    });
    user.id = -seed;

    const member = WorkspaceMember.create({
      workspaceId,
      userId: user.id,
      role: WorkspaceRole.COLLABORATOR,
      joinedAt: faker.date.past(),
    });
    member.id = -(seed + 1);
    member.user = user;
    fakes.push(member);
  }

  const merged = [...page.content, ...fakes];
  const total = page.total + n;

  return new Page({
    ...page,
    content: merged,
    total,
    hasPrevious: page.page > 0,
    hasNext: total > page.page * page.count + merged.length,
  });
}
