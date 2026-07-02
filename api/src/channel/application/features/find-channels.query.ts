import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { IsNumber, IsOptional } from 'class-validator';
import { ChannelRepository } from 'src/channel/infrastructure/repositories';
import { Issuer } from 'src/core/auth';
import { patch } from 'src/core/objects';
import { IssuerUserIsNotWorkspaceMember } from 'src/workspace/domain/exceptions';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories';
import { Meeting } from 'src/channel/domain/entities/meeting.entity';
import { Message } from 'src/channel/domain/entities/message.entity';
import { enrichChannelsForPreview } from '../utils/enrich-channel';
import { ChannelType } from 'src/channel/domain';

export class FindChannels {
  workspaceId: number;
  issuer: Issuer;

  @IsOptional()
  @IsNumber()
  teamId?: number;

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

  async execute({ issuer, workspaceId, teamId }: FindChannels) {
    const member = await this.workspaceRepo.findMember(workspaceId, issuer.id);
    if (!member) throw new IssuerUserIsNotWorkspaceMember();

    const query = this.channelRepo
      .createQueryBuilder('c')
      .innerJoin('c.peers', 'peer', 'peer.id = :userId', { userId: issuer.id })
      .leftJoinAndSelect('c.peers', 'p')
      .leftJoinAndMapOne(
        'c.meeting',
        Meeting,
        'm',
        'm.channel_id = c.id AND m.ongoing = true',
      )
      .leftJoinAndSelect('c.lastMessage', 'msg')
      .leftJoinAndSelect('msg.sender', 'lastMsgSender')
      .where('c.workspaceId = :workspaceId', { workspaceId })
      .andWhere(teamId ? 'c.teamId = :teamId' : 'TRUE', { teamId })
      .andWhere('c.type <> :type', { type: 'workspace_open' as ChannelType })
      .addSelect(
        (qb) =>
          qb
            .select('COUNT(unread_msg.id)', 'cnt')
            .from(Message, 'unread_msg')
            .where('unread_msg.channelId = c.id')
            .andWhere(
              `unread_msg.sentAt > COALESCE(
                (SELECT cmr.last_read_at FROM channel.channel_member_read cmr
                 WHERE cmr.user_id = :userId AND cmr.channel_id = c.id),
                '-infinity'::timestamptz
              )`,
            ),
        'unreadCount',
      )
      .orderBy(
        'CASE WHEN msg.id is null THEN c.createdAt ELSE msg.sentAt END',
        'DESC',
      );

    const { entities, raw } = await query.getRawAndEntities();
    const unreadCounts = entities.map((_, idx) =>
      Number(raw[idx]?.unreadCount ?? 0),
    );
    return enrichChannelsForPreview(entities, issuer.id, unreadCounts);
  }
}
