import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { IsString } from 'class-validator';
import { patch } from 'src/core/objects';
import { IssuerUserIsNotWorkspaceMember } from 'src/workspace/domain/exceptions';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories/workspace.repository';
import {
  ChannelRepository,
  ScheduledMeetingOccurrenceRepository,
} from 'src/channel/infrastructure/repositories';

export class GetScheduledMeetingOccurrence {
  @IsString()
  occurrenceId: string;

  issuerId: number;

  constructor(data: Partial<GetScheduledMeetingOccurrence>) {
    patch(this, data);
  }
}

@QueryHandler(GetScheduledMeetingOccurrence)
export class GetScheduledMeetingOccurrenceHandler
  implements IQueryHandler<GetScheduledMeetingOccurrence>
{
  constructor(
    private workspaceRepo: WorkspaceRepository,
    private channelRepo: ChannelRepository,
    private occurrenceRepo: ScheduledMeetingOccurrenceRepository,
  ) {}

  async execute(query: GetScheduledMeetingOccurrence) {
    const occ = await this.occurrenceRepo.findOne({
      where: { id: query.occurrenceId as any },
      relations: {
        scheduledMeeting: { participants: true },
        meeting: { attendees: { user: true } },
      } as any,
    });
    if (!occ) throw new BadRequestException('Occurrence not found');

    const meeting = (occ as any).scheduledMeeting;
    const workspaceId = meeting.workspaceId as number;

    const member = await this.workspaceRepo.findMember(
      workspaceId,
      query.issuerId,
    );
    if (!member) throw new IssuerUserIsNotWorkspaceMember();

    // Access rules:
    // - If tied to channel: only channel members (peers) can access, regardless of public/private.
    // - Else (standalone): public => any workspace member; private => participants only.
    if (meeting.channelId) {
      const isChannelMember = await this.channelRepo
        .createQueryBuilder('channel')
        .innerJoin('channel.peers', 'peer', 'peer.id = :userId', {
          userId: query.issuerId,
        })
        .where('channel.id = :channelId', { channelId: meeting.channelId })
        .getExists();
      if (!isChannelMember)
        throw new ForbiddenException('Not a channel member');
    } else if (!meeting.isPublic) {
      const isParticipant = (meeting.participants ?? []).some(
        (u: any) => u.id === query.issuerId,
      );
      if (!isParticipant) throw new ForbiddenException('Not a participant');
    }

    return occ;
  }
}
