import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { IsString } from 'class-validator';
import { patch } from 'src/core/objects';
import { ScheduledEventRepository } from 'src/notifications/repositories';
import { IssuerUserIsNotWorkspaceMember } from 'src/workspace/domain/exceptions';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories/workspace.repository';
import {
  ChannelRepository,
  ScheduledMeetingRepository,
} from 'src/channel/infrastructure/repositories';
import { WorkspaceRole } from 'src/workspace/domain/values/workspace-role.value';

export class RemoveScheduledMeeting {
  @IsString()
  scheduledMeetingId: string;

  issuerId: number;

  constructor(data: Partial<RemoveScheduledMeeting>) {
    patch(this, data);
  }
}

@CommandHandler(RemoveScheduledMeeting)
export class RemoveScheduledMeetingCommand
  implements ICommandHandler<RemoveScheduledMeeting>
{
  constructor(
    private workspaceRepo: WorkspaceRepository,
    private channelRepo: ChannelRepository,
    private scheduledMeetingRepo: ScheduledMeetingRepository,
    private scheduledEventRepo: ScheduledEventRepository,
  ) {}

  async execute(command: RemoveScheduledMeeting) {
    const meeting = await this.scheduledMeetingRepo.findOne({
      where: { id: command.scheduledMeetingId as any },
      relations: { participants: true },
    });
    if (!meeting) throw new BadRequestException('Scheduled meeting not found');

    const issuerMember = await this.workspaceRepo.findMember(
      meeting.workspaceId,
      command.issuerId,
    );
    if (!issuerMember) throw new IssuerUserIsNotWorkspaceMember();

    const canAdmin =
      issuerMember.hasRole(WorkspaceRole.ADMIN) ||
      issuerMember.hasRole(WorkspaceRole.OWNER);

    if (!canAdmin && meeting.createdById !== command.issuerId) {
      throw new ForbiddenException(
        'Only creator or workspace admin can remove',
      );
    }

    if (meeting.channelId) {
      const isChannelMember = await this.channelRepo
        .createQueryBuilder('channel')
        .innerJoin('channel.peers', 'peer', 'peer.id = :userId', {
          userId: command.issuerId,
        })
        .where('channel.id = :channelId', { channelId: meeting.channelId })
        .getExists();
      if (!isChannelMember)
        throw new ForbiddenException('Not a channel member');
    }

    // Delete unprocessed reminders for this meeting series.
    await this.scheduledEventRepo.manager.query(
      `DELETE FROM scheduler.scheduled_events
       WHERE processed = false
         AND payload->>'scheduledMeetingId' = $1`,
      [meeting.id],
    );

    // Cascade deletes: occurrences + participants join rows.
    await this.scheduledMeetingRepo.delete({ id: meeting.id as any });

    return { success: true, scheduledMeetingId: meeting.id };
  }
}
