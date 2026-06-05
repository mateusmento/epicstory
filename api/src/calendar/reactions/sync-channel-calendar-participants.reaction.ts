import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  ChannelMemberAddedEvent,
  type ChannelMemberAddedPayload,
} from 'src/channel/application/contracts/channel-member-added.event';
import {
  ChannelMemberRemovedEvent,
  type ChannelMemberRemovedPayload,
} from 'src/channel/application/contracts/channel-member-removed.event';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories';
import { CalendarEventRepository } from '../repositories';

@Injectable()
export class SyncChannelCalendarParticipantsReaction {
  constructor(
    private calendarEventRepo: CalendarEventRepository,
    private workspaceRepo: WorkspaceRepository,
  ) {}

  @OnEvent(ChannelMemberAddedEvent, { async: true })
  async onMemberAdded(payload: ChannelMemberAddedPayload) {
    const member = await this.workspaceRepo.requiresMembership(
      payload.workspaceId,
      payload.userId,
      { user: true },
    );

    const events = await this.calendarEventRepo.findByChannelId(
      payload.channelId,
    );

    for (const event of events) {
      const alreadyParticipant = (event.participants ?? []).some(
        (p) => p.id === payload.userId,
      );
      if (alreadyParticipant) continue;

      event.participants = [...(event.participants ?? []), member.user];
      await this.calendarEventRepo.save(event);
    }
  }

  @OnEvent(ChannelMemberRemovedEvent, { async: true })
  async onMemberRemoved(payload: ChannelMemberRemovedPayload) {
    const events = await this.calendarEventRepo.findByChannelId(
      payload.channelId,
    );

    for (const event of events) {
      const nextParticipants = (event.participants ?? []).filter(
        (p) => p.id !== payload.userId,
      );
      if (nextParticipants.length === (event.participants ?? []).length)
        continue;

      event.participants = nextParticipants;
      await this.calendarEventRepo.save(event);
    }
  }
}
