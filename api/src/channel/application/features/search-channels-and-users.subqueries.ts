import { User } from 'src/auth';
import { Channel } from 'src/channel/domain/entities/channel.entity';
import { ChannelRepository } from 'src/channel/infrastructure/repositories';
import { WorkspaceMember } from 'src/workspace/domain/entities/workspace-member.entity';
import { WorkspaceMemberRepository } from 'src/workspace/infrastructure/repositories';
import type { SelectQueryBuilder } from 'typeorm';

/**
 * Bound parameters don't expand reliably inside raw `addSelect()` for all drivers;
 * the issuer peer is joined as `mem`, so subqueries use "mem"."id" instead of :userId.
 */
const CHANNEL_SORT_KEY_SQL = `
CASE c.type
  WHEN 'group' THEN LOWER(TRIM(COALESCE(c.name, '')))
  WHEN 'direct' THEN COALESCE((
    SELECT LOWER(COALESCE(u.name, ''))
    FROM channel.channel_peers cp
    INNER JOIN auth.users u ON u.id = cp.users_id
    WHERE cp.channel_id = c.id AND cp.users_id != "mem"."id"
    LIMIT 1
  ), '')
  WHEN 'multi-direct' THEN LOWER(COALESCE(
    NULLIF(TRIM(COALESCE(c.name, '')), ''),
    (SELECT MIN(LOWER(COALESCE(u.name, '')))
     FROM channel.channel_peers cp
     INNER JOIN auth.users u ON u.id = cp.users_id
     WHERE cp.channel_id = c.id AND cp.users_id != "mem"."id")
  ))
  ELSE ''
END
`.trim();

/** Text filter on channel display: name or any non-issuer peer name/email. */
const CHANNEL_TEXT_MATCH_SQL = `(
  (c.type = 'group' AND c.name ILIKE :pattern)
  OR (c.type = 'direct' AND EXISTS (
    SELECT 1 FROM channel.channel_peers cp
    INNER JOIN auth.users u ON u.id = cp.users_id
    WHERE cp.channel_id = c.id AND cp.users_id != "mem"."id"
    AND (u.name ILIKE :pattern OR u.email ILIKE :pattern)
  ))
  OR (c.type = 'multi-direct' AND (
    c.name ILIKE :pattern
    OR EXISTS (
      SELECT 1 FROM channel.channel_peers cp
      INNER JOIN auth.users u ON u.id = cp.users_id
      WHERE cp.channel_id = c.id AND cp.users_id != "mem"."id"
      AND (u.name ILIKE :pattern OR u.email ILIKE :pattern)
    )
  ))
)`;

export type ChannelUserSearchScope = {
  issuerId: number;
  workspaceId: number;
  /** optional team filter, same semantics as FindChannels */
  teamId?: number;
  /** ILIKE pattern including % wildcards, or null = no text filter */
  ilikePattern: string | null;
};

function assertFiniteIntIds(scope: ChannelUserSearchScope): void {
  if (
    !Number.isFinite(scope.issuerId) ||
    !Number.isFinite(scope.workspaceId) ||
    (scope.teamId !== undefined && !Number.isFinite(scope.teamId))
  ) {
    throw new Error('channel search: invalid numeric scope');
  }
}

/**
 * Channels the issuer belongs to: group, direct, multi-direct; optional team + text filter.
 * Selects ref_id, UNION kind=0, sort_key for ordering.
 */
export function createMemberChannelsUnionSelect(
  channelRepo: ChannelRepository,
  scope: ChannelUserSearchScope,
): SelectQueryBuilder<Channel> {
  assertFiniteIntIds(scope);
  const { issuerId, workspaceId, teamId, ilikePattern } = scope;

  let qb = channelRepo
    .createQueryBuilder('c')
    .select('c.id', 'ref_id')
    .addSelect('0', 'kind')
    .addSelect(CHANNEL_SORT_KEY_SQL, 'sort_key')
    .innerJoin('c.peers', 'mem', `"mem"."id" = ${issuerId}`)
    .where(`"c"."workspace_id" = ${workspaceId}`)
    .andWhere("c.type IN ('group', 'direct', 'multi-direct')");

  if (teamId !== undefined) {
    qb = qb.andWhere(`"c"."team_id" = ${teamId}`);
  }

  if (ilikePattern) {
    qb = qb.andWhere(CHANNEL_TEXT_MATCH_SQL, { pattern: ilikePattern });
  }

  return qb;
}

/**
 * Workspace members without an existing 1:1 direct with the issuer; optional name/email filter.
 * Selects ref_id (user id), UNION kind=1, sort_key.
 */
export function createDirectMessageCandidatesUnionSelect(
  workspaceMemberRepo: WorkspaceMemberRepository,
  scope: ChannelUserSearchScope,
): SelectQueryBuilder<WorkspaceMember> {
  assertFiniteIntIds(scope);
  const { issuerId, workspaceId, ilikePattern } = scope;

  let qb = workspaceMemberRepo
    .createQueryBuilder('wm')
    .select('u.id', 'ref_id')
    .addSelect('1', 'kind')
    .addSelect('LOWER(COALESCE(u.name, u.email))', 'sort_key')
    .innerJoin(User, 'u', 'u.id = wm.userId')
    .where(`"wm"."workspace_id" = ${workspaceId}`)
    .andWhere(`"wm"."user_id" != ${issuerId}`)
    .andWhere(
      `NOT EXISTS (
          SELECT 1 FROM channel.channel dc
          INNER JOIN channel.channel_peers p1 ON p1.channel_id = dc.id AND p1.users_id = ${issuerId}
          INNER JOIN channel.channel_peers p2 ON p2.channel_id = dc.id AND p2.users_id = u.id
          WHERE dc.type = 'direct' AND dc.workspace_id = "wm"."workspace_id"
        )`,
    );

  if (ilikePattern) {
    qb = qb.andWhere('(u.name ILIKE :pattern OR u.email ILIKE :pattern)', {
      pattern: ilikePattern,
    });
  }

  return qb;
}
