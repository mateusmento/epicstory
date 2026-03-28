import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Type } from 'class-transformer';
import { IsDate, IsNumber, IsOptional } from 'class-validator';
import { patch } from 'src/core/objects';
import { IssuerUserIsNotWorkspaceMember } from 'src/workspace/domain/exceptions';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories/workspace.repository';
import { ScheduledMeetingOccurrenceRepository } from 'src/channel/infrastructure/repositories';

export class FindScheduledMeetings {
  @IsNumber()
  workspaceId: number;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  start?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  end?: Date;

  issuerId: number;

  constructor(data: Partial<FindScheduledMeetings>) {
    patch(this, data);
  }
}

@QueryHandler(FindScheduledMeetings)
export class FindScheduledMeetingsHandler
  implements IQueryHandler<FindScheduledMeetings>
{
  constructor(
    private workspaceRepo: WorkspaceRepository,
    private occurrenceRepo: ScheduledMeetingOccurrenceRepository,
  ) {}

  async execute(query: FindScheduledMeetings) {
    const member = await this.workspaceRepo.findMember(
      query.workspaceId,
      query.issuerId,
    );
    if (!member) throw new IssuerUserIsNotWorkspaceMember();

    const qb = this.occurrenceRepo
      .createQueryBuilder('occ')
      .innerJoin('occ.scheduledMeeting', 'm')
      .where('m.workspaceId = :workspaceId', {
        workspaceId: query.workspaceId,
      });

    if (query.start) {
      qb.andWhere('occ.startsAt >= :start', { start: query.start });
    }
    if (query.end) {
      qb.andWhere('occ.startsAt <= :end', { end: query.end });
    }

    qb.orderBy('occ.startsAt', 'ASC');

    const rows = await qb
      .select([
        'occ.id',
        'occ.startsAt',
        'occ.endsAt',
        'occ.meetingId',
        'm.id',
        'm.title',
        'm.description',
        'm.channelId',
        'm.isPublic',
        'm.notifyMinutesBefore',
      ])
      .getMany();

    // Access filtering: if tied to channel, only channel members should see it.
    // For now we return all occurrences; lobby access will enforce stricter rules.
    // (Schedule UI will also filter later by channel membership as needed.)
    return rows.map((occ: any) => ({
      id: occ.id,
      startsAt: occ.startsAt,
      endsAt: occ.endsAt,
      meetingId: occ.meetingId,
      scheduledMeeting: {
        id: occ.scheduledMeeting?.id,
        title: occ.scheduledMeeting?.title,
        description: occ.scheduledMeeting?.description,
        channelId: occ.scheduledMeeting?.channelId,
        isPublic: occ.scheduledMeeting?.isPublic,
        notifyMinutesBefore: occ.scheduledMeeting?.notifyMinutesBefore,
      },
    }));
  }
}
