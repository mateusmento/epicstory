import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories';
import { CalendarEvent } from '../entities';

/**
 * Shared access rules for calendar meetings:
 * - issuer must be a workspace member
 * - issuer must be creator or an explicit participant (channel peers are denormalized into participants)
 */
export async function assertCalendarMeetingAccess(args: {
  workspaceRepo: WorkspaceRepository;
  issuerId: number;
  event: CalendarEvent;
}): Promise<void> {
  const { workspaceRepo, issuerId, event } = args;

  if (event.type !== 'meeting') throw new BadRequestException('Not a meeting');

  await workspaceRepo.requiresMembership(event.workspaceId, issuerId);

  if (!event.hasParticipant(issuerId))
    throw new ForbiddenException('Not a participant');
}
