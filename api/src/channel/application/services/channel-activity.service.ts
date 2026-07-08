import { Injectable } from '@nestjs/common';
import type {
  ChannelActivityPayload,
  ChannelActivityType,
  IChannelActivity,
  IPage,
} from '@epicstory/contracts';
import { ChannelActivity } from 'src/channel/domain/entities/channel-activity.entity';
import { Message } from 'src/channel/domain/entities/message.entity';
import { ChannelRepository } from 'src/channel/infrastructure';
import { ChannelActivityRepository } from 'src/channel/infrastructure/repositories/channel-activity.repository';
import { MeetingRepository } from 'src/channel/infrastructure/repositories/meeting.repository';
import { MessageRepository } from 'src/channel/infrastructure/repositories/message.repository';
import { create } from 'src/core/objects';
import { Page } from 'src/core/page';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories';
import { userToIUser } from 'src/auth';
import { ChannelNotFound, IssuerIsNotChannelMember } from '../exceptions';
import { MessageGateway } from '../gateways/message.gateway';
import type { IMessage } from '@epicstory/contracts';
import { MessageService } from './message.service';

@Injectable()
export class ChannelActivityService {
  constructor(
    private activityRepo: ChannelActivityRepository,
    private channelRepo: ChannelRepository,
    private workspaceRepo: WorkspaceRepository,
    private meetingRepo: MeetingRepository,
    private messageRepo: MessageRepository,
    private messageService: MessageService,
    private messageGateway: MessageGateway,
  ) {}

  async findPageForChannel(
    channelId: number,
    viewerId: number,
    options: {
      limit: number;
      beforeCreatedAt?: Date;
      beforeId?: number;
    },
  ): Promise<IPage<IChannelActivity>> {
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

    const take = Math.min(Math.max(1, options.limit), 100) + 1;

    const qb = this.activityRepo
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.actor', 'actor')
      .leftJoinAndSelect('a.subjectUser', 'subjectUser')
      .where('a.channelId = :channelId', { channelId })
      .orderBy('a.createdAt', 'DESC')
      .addOrderBy('a.id', 'DESC')
      .take(take);

    if (options.beforeCreatedAt != null && options.beforeId != null) {
      qb.andWhere(
        '(a.createdAt < :bc OR (a.createdAt = :bc AND a.id < :bid))',
        {
          bc: options.beforeCreatedAt,
          bid: options.beforeId,
        },
      );
    }

    const rawDesc = await qb.getMany();
    const hasMoreOlder = rawDesc.length >= take;
    const pageRows = (hasMoreOlder ? rawDesc.slice(0, take - 1) : rawDesc)
      .slice()
      .reverse();

    const messageIds = pageRows
      .filter((r) => r.type === 'message_sent' && r.messageId != null)
      .map((r) => r.messageId!);

    const messagesMap = await this.messageService.findMessagesByIdsForChannel(
      channelId,
      messageIds,
      viewerId,
    );

    const items = pageRows.map((r) =>
      this.rowToClient(r, {
        messagesMap,
      }),
    );

    const hasCursor =
      options.beforeCreatedAt != null && options.beforeId != null;

    return new Page({
      content: items,
      page: 0,
      count: Math.min(Math.max(1, options.limit), 100),
      hasNext: hasMoreOlder,
      hasPrevious: hasCursor,
      total: 0,
    });
  }

  async publishMessageSent(options: {
    channelId: number;
    senderId: number;
    messageId: number;
    websocket?: { excludeUserId?: number; includeIssuer?: boolean };
  }): Promise<IChannelActivity> {
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
    organizerUserId?: number | null;
  }): Promise<{ threadMessageId: number | null }> {
    const meeting = await this.meetingRepo.findOne({
      where: { id: options.meetingId },
    });

    if (!meeting?.channelId) return { threadMessageId: null };

    const channel = await this.channelRepo.findOneBy({
      id: meeting.channelId,
    });

    // Meeting channels are persistent voice rooms — no activity card is created.
    if (channel?.type === 'meeting') return { threadMessageId: null };

    // Channel meetings seed a hidden message to anchor the reply thread.
    // Saved directly (bypassing MessageService) so Channel.lastMessageId is not updated.
    const seedSenderId = options.actorId ?? options.organizerUserId ?? null;
    let threadMessageId: number | null = null;
    if (seedSenderId != null) {
      const seedMessage = await this.messageRepo.save(
        create(Message, {
          channelId: meeting.channelId,
          senderId: seedSenderId,
          content: { type: 'doc', content: [] },
          sentAt: new Date(),
        }),
      );
      threadMessageId = seedMessage.id;
      meeting.threadMessageId = threadMessageId;
      await this.meetingRepo.save(meeting);
    }

    const row = await this.activityRepo.save(
      create(ChannelActivity, {
        channelId: meeting.channelId,
        type: 'meeting_started',
        actorId: options.actorId,
        meetingId: meeting.id,
        messageId: threadMessageId,
        payload: null,
      }),
    );

    const full = await this.activityRepo.findOne({
      where: { id: row.id },
      relations: { actor: true, subjectUser: true },
    });

    const client = this.rowToClient(full!, {});
    this.messageGateway.emitIncomingChannelActivity(client);

    return { threadMessageId };
  }

  private rowToClient(
    row: ChannelActivity,
    ctx: {
      messagesMap?: Map<number, IMessage>;
    },
  ): IChannelActivity {
    const { messagesMap } = ctx;

    let message: IChannelActivity['message'] = null;
    if (row.type === 'message_sent' && row.messageId != null && messagesMap) {
      message = messagesMap.get(row.messageId) ?? null;
    }

    return {
      id: row.id,
      channelId: row.channelId,
      type: row.type as ChannelActivityType,
      createdAt: row.createdAt.toISOString(),
      actor: row.actor ? userToIUser(row.actor) : null,
      messageId: row.messageId,
      meetingId: row.meetingId,
      payload: (row.payload as ChannelActivityPayload | null) ?? null,
      ...(row.subjectUser ? { subjectUser: userToIUser(row.subjectUser) } : {}),
      ...(message ? { message } : {}),
    } as IChannelActivity;
  }
}
