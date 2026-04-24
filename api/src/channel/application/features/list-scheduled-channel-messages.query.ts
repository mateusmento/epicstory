import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { ChannelRepository } from 'src/channel/infrastructure';
import { patch } from 'src/core/objects';
import { ScheduledJobRepository } from 'src/scheduling/repositories';
import { IssuerUserIsNotWorkspaceMember } from 'src/workspace/domain/exceptions';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories';
import {
  toScheduledMessageDto,
  ScheduledMessageDto,
} from '../dtos/scheduled-message.dto';
import { ChannelNotFound, SenderIsNotChannelMember } from '../exceptions';

export class ListScheduledChannelMessages {
  channelId: number;
  issuerId: number;

  constructor(data: Partial<ListScheduledChannelMessages>) {
    patch(this, data);
  }
}

@QueryHandler(ListScheduledChannelMessages)
export class ListScheduledChannelMessagesQuery
  implements IQueryHandler<ListScheduledChannelMessages>
{
  constructor(
    private channelRepo: ChannelRepository,
    private workspaceRepo: WorkspaceRepository,
    private scheduledJobRepo: ScheduledJobRepository,
  ) {}

  async execute(
    q: ListScheduledChannelMessages,
  ): Promise<ScheduledMessageDto[]> {
    const channel = await this.channelRepo.findOne({
      where: { id: q.channelId },
      relations: { peers: true },
    });
    if (!channel) throw new ChannelNotFound();

    const issuerMember = await this.workspaceRepo.findMember(
      channel.workspaceId,
      q.issuerId,
    );
    if (!issuerMember) throw new IssuerUserIsNotWorkspaceMember();

    const peerIds = channel.peers.map((p) => p.id);
    if (!peerIds.includes(q.issuerId)) throw new SenderIsNotChannelMember();

    const jobs = await this.scheduledJobRepo.findScheduledMessagesByChannel({
      channelId: q.channelId,
      workspaceId: channel.workspaceId,
    });

    return jobs.map((j) => toScheduledMessageDto(j));
  }
}
