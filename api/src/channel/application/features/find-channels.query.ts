import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { ChannelRepository } from 'src/channel/infrastructure/repositories/channel.repository';
import { Issuer } from 'src/core/auth';
import { patch } from 'src/core/objects';
import { IssuerUserIsNotWorkspaceMember } from 'src/workspace/domain/exceptions/issuer-user-is-not-workspace-member';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories/workspace.repository';

export class FindChannels {
  workspaceId: number;
  issuer: Issuer;

  constructor(partial: Partial<FindChannels> = {}) {
    patch(this, partial);
  }
}

@QueryHandler(FindChannels)
export class FindChannelsQuery implements IQueryHandler<FindChannels> {
  constructor(
    private workspaceRepo: WorkspaceRepository,
    private channelRepo: ChannelRepository,
  ) {}

  async execute({ issuer, workspaceId }: FindChannels) {
    const member = await this.workspaceRepo.findMember(workspaceId, issuer.id);
    if (!member) throw new IssuerUserIsNotWorkspaceMember();
    return this.channelRepo.find({ where: { workspaceId } });
  }
}
