import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Channel } from 'src/channel/domain/entities/channel.entity';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories';
import { DataSource } from 'typeorm';
import { CalendarEvent } from '../entities';

/**
 * Shared access rules for calendar meetings:
 * - issuer must be a workspace member
 * - if meeting is channel-backed, issuer must be a channel peer
 * - if channel-less and not public, issuer must be creator or an explicit participant
 *
 * Returns the channelId (may be null) for convenience.
 */
export async function assertCalendarMeetingAccess(args: {
  dataSource: DataSource;
  workspaceRepo: WorkspaceRepository;
  issuerId: number;
  event: CalendarEvent;
  channelId?: number | null;
}): Promise<void> {
  const { dataSource, workspaceRepo, issuerId, event, channelId } = args;

  if (event.type !== 'meeting') throw new BadRequestException('Not a meeting');

  const member = await workspaceRepo.findMember(event.workspaceId, issuerId);
  if (!member) throw new ForbiddenException('Not a workspace member');

  if (channelId) {
    const channelRepo = dataSource.getRepository(Channel);
    const isChannelMember = await channelRepo
      .createQueryBuilder('channel')
      .innerJoin('channel.peers', 'peer', 'peer.id = :userId', {
        userId: issuerId,
      })
      .where('channel.id = :channelId', { channelId })
      .getExists();
    if (!isChannelMember) throw new ForbiddenException('Not a channel member');
    return;
  }

  if (!event.hasParticipant(issuerId))
    throw new ForbiddenException('Not a participant');
}
