import { Injectable } from '@nestjs/common';
import type { IChannelActivityMeetingSummary } from '@epicstory/contracts';
import type { ChannelActivityType } from '@epicstory/contracts';
import { uniq } from 'lodash';
import { ChannelActivity } from 'src/channel/domain/entities/channel-activity.entity';
import { ChannelRepository } from 'src/channel/infrastructure';
import { ChannelActivityRepository } from 'src/channel/infrastructure/repositories/channel-activity.repository';
import { MeetingRepository } from 'src/channel/infrastructure/repositories/meeting.repository';
import { create } from 'src/core/objects';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories';
import { In } from 'typeorm';
import {
  type IChannelActivityClient,
  meetingToChannelActivityMeetingSummary,
  userToSummary,
} from '../dtos/channel-activity-client.dto';
import { ChannelNotFound, IssuerIsNotChannelMember } from '../exceptions';
import { MessageGateway } from '../gateways/message.gateway';
import type { IMessagePayload } from './message.service';
import { MessageService } from './message.service';

@Injectable()
export class ChannelActivityService {
  constructor(
    private activityRepo: ChannelActivityRepository,
    private channelRepo: ChannelRepository,
    private workspaceRepo: WorkspaceRepository,
    private meetingRepo: MeetingRepository,
    private messageService: MessageService,
    private messageGateway: MessageGateway,
  ) {}

  async findForChannel(
    channelId: number,
    viewerId: number,
  ): Promise<IChannelActivityClient[]> {
    const channel = await this.channelRepo.findOne({
      where: { id: channelId },
      relations: { peers: true },
    });
    if (!channel) {
      throw new ChannelNotFound();
    }

    await this.workspaceRepo.requiresMembership(channel.workspaceId, viewerId);

    if (channel.type !== 'workspace_open' && !channel.hasMember(viewerId)) {
      throw new IssuerIsNotChannelMember();
    }

    const rows = await this.activityRepo.find({
      where: { channelId },
      relations: { actor: true, subjectUser: true },
      order: { createdAt: 'ASC' },
    });

    const messageIds = rows
      .filter((r) => r.type === 'message_sent' && r.messageId != null)
      .map((r) => r.messageId!);

    const meetingIds = uniq(
      rows
        .filter((r) => r.type === 'meeting_started' && r.meetingId != null)
        .map((r) => r.meetingId!),
    );

    const messagesMap = await this.messageService.findMessagesByIdsForChannel(
      channelId,
      messageIds,
      viewerId,
    );

    const meetingsMap = await this.loadMeetingSummaries(meetingIds);

    return rows.map((r) =>
      this.rowToClient(r, {
        messagesMap,
        meetingsMap,
      }),
    );
  }

  private async loadMeetingSummaries(
    meetingIds: number[],
  ): Promise<Map<number, IChannelActivityMeetingSummary>> {
    if (meetingIds.length === 0) return new Map();
    const meetings = await this.meetingRepo.find({
      where: { id: In(meetingIds) },
      relations: { attendees: { user: true } },
    });
    return new Map(
      meetings.map((m) => [m.id, meetingToChannelActivityMeetingSummary(m)]),
    );
  }

  async publishMessageSent(options: {
    channelId: number;
    senderId: number;
    messageId: number;
    websocket?: { excludeUserId?: number; includeIssuer?: boolean };
  }): Promise<IChannelActivityClient> {
    const row = await this.activityRepo.save(
      create(ChannelActivity, {
        channelId: options.channelId,
        type: 'message_sent',
        actorId: options.senderId,
        messageId: options.messageId,
        payload: null,
      }),
    );

    const full = await this.activityRepo.findOne({
      where: { id: row.id },
      relations: { actor: true, subjectUser: true },
    });

    const client = this.rowToClient(full!, {
      messagesMap: await this.messageService.findMessagesByIdsForChannel(
        options.channelId,
        [options.messageId],
        options.senderId,
      ),
    });

    this.messageGateway.emitIncomingChannelActivity(client, {
      excludeUserId: options.websocket?.includeIssuer
        ? undefined
        : options.websocket?.excludeUserId,
      includeIssuer: options.websocket?.includeIssuer,
    });

    return client;
  }

  async publishChannelRenamed(options: {
    channelId: number;
    actorId: number;
    previousName: string;
    newName: string;
  }): Promise<void> {
    const row = await this.activityRepo.save(
      create(ChannelActivity, {
        channelId: options.channelId,
        type: 'channel_renamed',
        actorId: options.actorId,
        payload: {
          previousName: options.previousName,
          newName: options.newName,
        },
      }),
    );

    const full = await this.activityRepo.findOne({
      where: { id: row.id },
      relations: { actor: true, subjectUser: true },
    });

    const client = this.rowToClient(full!, {});
    this.messageGateway.emitIncomingChannelActivity(client);
  }

  async publishUserAdded(options: {
    channelId: number;
    actorId: number;
    subjectUserId: number;
  }): Promise<void> {
    const row = await this.activityRepo.save(
      create(ChannelActivity, {
        channelId: options.channelId,
        type: 'user_added',
        actorId: options.actorId,
        subjectUserId: options.subjectUserId,
        payload: null,
      }),
    );

    const full = await this.activityRepo.findOne({
      where: { id: row.id },
      relations: { actor: true, subjectUser: true },
    });

    const client = this.rowToClient(full!, {});
    this.messageGateway.emitIncomingChannelActivity(client);
  }

  async publishUserRemoved(options: {
    channelId: number;
    actorId: number;
    subjectUserId: number;
  }): Promise<void> {
    const row = await this.activityRepo.save(
      create(ChannelActivity, {
        channelId: options.channelId,
        type: 'user_removed',
        actorId: options.actorId,
        subjectUserId: options.subjectUserId,
        payload: null,
      }),
    );

    const full = await this.activityRepo.findOne({
      where: { id: row.id },
      relations: { actor: true, subjectUser: true },
    });

    const client = this.rowToClient(full!, {});
    this.messageGateway.emitIncomingChannelActivity(client);
  }

  async publishMeetingStarted(options: {
    meetingId: number;
    actorId: number | null;
  }): Promise<void> {
    const meeting = await this.meetingRepo.findOne({
      where: { id: options.meetingId },
      relations: { attendees: { user: true } },
    });

    if (!meeting?.channelId) return;

    const row = await this.activityRepo.save(
      create(ChannelActivity, {
        channelId: meeting.channelId,
        type: 'meeting_started',
        actorId: options.actorId,
        meetingId: meeting.id,
        payload: null,
      }),
    );

    const full = await this.activityRepo.findOne({
      where: { id: row.id },
      relations: { actor: true, subjectUser: true },
    });

    const meetingsMap = await this.loadMeetingSummaries([meeting.id]);
    const client = this.rowToClient(full!, { meetingsMap });
    this.messageGateway.emitIncomingChannelActivity(client);
  }

  private rowToClient(
    row: ChannelActivity,
    ctx: {
      messagesMap?: Map<number, IMessagePayload>;
      meetingsMap?: Map<number, IChannelActivityMeetingSummary>;
    },
  ): IChannelActivityClient {
    const { messagesMap, meetingsMap } = ctx;

    let message: IChannelActivityClient['message'] = null;
    if (row.type === 'message_sent' && row.messageId != null && messagesMap) {
      message = messagesMap.get(row.messageId) ?? null;
    }

    let meeting: IChannelActivityClient['meeting'];
    if (
      row.type === 'meeting_started' &&
      row.meetingId != null &&
      meetingsMap
    ) {
      meeting = meetingsMap.get(row.meetingId) ?? null;
    }

    return {
      id: row.id,
      channelId: row.channelId,
      type: row.type as ChannelActivityType,
      createdAt: row.createdAt.toISOString(),
      actor: row.actor ? userToSummary(row.actor) : null,
      messageId: row.messageId,
      meetingId: row.meetingId,
      payload: row.payload,
      ...(row.subjectUser
        ? { subjectUser: userToSummary(row.subjectUser) }
        : {}),
      ...(message ? { message } : {}),
      ...(meeting !== undefined ? { meeting } : {}),
    };
  }
}
