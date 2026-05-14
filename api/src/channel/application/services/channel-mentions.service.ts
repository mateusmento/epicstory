import { Injectable } from '@nestjs/common';
import { uniq } from 'lodash';
import { User } from 'src/auth';
import { Channel } from 'src/channel/domain';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories';

/**
 * Mention map for display + validation: peers for normal channels,
 * workspace membership for `workspace_open`.
 */
@Injectable()
export class ChannelMentionsService {
  constructor(private workspaceRepo: WorkspaceRepository) {}

  async resolveMentionUsersMap(
    channel: Channel | null | undefined,
    candidateUserIds: number[],
  ): Promise<Map<number, User>> {
    const ids = uniq(candidateUserIds.filter(Boolean));
    if (!channel || ids.length === 0) {
      return new Map();
    }
    if (channel.type === 'workspace_open') {
      const workspaceId = channel.workspaceId;
      const members = await this.workspaceRepo.findMembers(
        { workspaceId, userIds: ids },
        { user: true },
      );
      return new Map<number, User>(members.map((u) => [u.userId, u.user]));
    }
    return new Map((channel.peers ?? []).map((u) => [u.id, u]));
  }
}
