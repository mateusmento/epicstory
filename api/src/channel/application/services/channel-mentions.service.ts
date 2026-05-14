import { Injectable } from '@nestjs/common';
import { uniq } from 'lodash';
import { User } from 'src/auth';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories';

/**
 * Mention map for display + validation: peers for normal channels,
 * workspace membership for `workspace_open`.
 */
@Injectable()
export class ChannelMentionsService {
  constructor(private workspaceRepo: WorkspaceRepository) {}

  async resolveMentionUsersMap(
    mentionIds: number[],
    workspaceId: number,
  ): Promise<Map<number, User>> {
    const ids = uniq(mentionIds);
    if (ids.length === 0) return new Map();
    const members = await this.workspaceRepo.findMembers(
      { workspaceId, userIds: ids },
      { user: true },
    );
    return new Map<number, User>(members.map((u) => [u.userId, u.user]));
  }
}
