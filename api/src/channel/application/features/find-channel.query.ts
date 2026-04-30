import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Meeting } from 'src/channel/domain/entities/meeting.entity';
import { ChannelRepository } from 'src/channel/infrastructure';
import { patch } from 'src/core/objects';
import { IssuerUserIsNotWorkspaceMember } from 'src/workspace/domain/exceptions';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories';
import { ChannelNotFound, IssuerIsNotChannelMember } from '../exceptions';
import { enrichChannelsForListView } from '../utils/channel-list-enrichment';

export class FindChannel {
  channelId: number;
  issuerId: number;

  constructor(data: Partial<FindChannel>) {
    patch(this, data);
  }
}

@QueryHandler(FindChannel)
export class FindChannelQuery implements IQueryHandler<FindChannel> {
  constructor(
    private channelRepo: ChannelRepository,
    private workspaceRepo: WorkspaceRepository,
  ) {}

  async execute({ channelId, issuerId }: FindChannel) {
    const channel = await this.channelRepo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.peers', 'p')
      .leftJoinAndSelect('c.lastMessage', 'msg')
      .leftJoinAndMapOne(
        'c.meeting',
        Meeting,
        'm',
        'm.channel_id = c.id AND m.ongoing = true',
      )
      .where('c.id = :id', { id: channelId })
      .getOne();

    if (!channel) throw new ChannelNotFound();

    const issuerMember = await this.workspaceRepo.findMember(
      channel.workspaceId,
      issuerId,
    );

    if (!issuerMember) throw new IssuerUserIsNotWorkspaceMember();

    if (!channel.hasMember(issuerId)) throw new IssuerIsNotChannelMember();

    enrichChannelsForListView([channel], issuerId);

    return channel;
  }
}
