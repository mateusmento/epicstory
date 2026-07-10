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
import {
  ChannelNotFound,
  IssuerIsNotChannelMember,
  MessageNotFound,
} from '../exceptions';
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

  private async assertCanReadChannel(channelId: number, viewerId: number) {
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

    return channel;
  }

  /** Drop duplicate activity ids and legacy duplicate message_sent rows for one message. */
  private dedupeActivityRows(rows: ChannelActivity[]): ChannelActivity[] {
    const seenIds = new Set<number>();
    const seenMessageIds = new Set<number>();
    const out: ChannelActivity[] = [];
    for (const row of rows) {
      if (seenIds.has(row.id)) continue;
      if (
        row.type === 'message_sent' &&
        row.messageId != null &&
        seenMessageIds.has(row.messageId)
      ) {
        continue;
      }
      seenIds.add(row.id);
      if (row.type === 'message_sent' && row.messageId != null) {
        seenMessageIds.add(row.messageId);
      }
      out.push(row);
    }
    return out;
  }

  private async enrichRows(
    channelId: number,
    viewerId: number,
    rows: ChannelActivity[],
  ): Promise<IChannelActivity[]> {
    const unique = this.dedupeActivityRows(rows);
    const messageIds = unique
      .filter((r) => r.type === 'message_sent' && r.messageId != null)
      .map((r) => r.messageId!);

    const messagesMap = await this.messageService.findMessagesByIdsForChannel(
      channelId,
      messageIds,
      viewerId,
    );

    return unique.map((r) => this.rowToClient(r, { messagesMap }));
  }

  /**
   * Contiguous ASC page.
   * - latest / before*: fetch DESC then reverse → content ASC; hasNext = more older
   * - after*: fetch ASC → content ASC; hasPrevious = more newer
   * hasPrevious/hasNext always reflect whether more newer/older exist beyond the window edges.
   */
  async findPageForChannel(
    channelId: number,
    viewerId: number,
    options: {
      limit: number;
      beforeCreatedAt?: Date;
      beforeId?: number;
      afterCreatedAt?: Date;
      afterId?: number;
    },
  ): Promise<IPage<IChannelActivity>> {
    await this.assertCanReadChannel(channelId, viewerId);

    const limit = Math.min(Math.max(1, options.limit), 100);
    const take = limit + 1;
    const fetchingNewer =
      options.afterCreatedAt != null && options.afterId != null;
    const fetchingOlder =
      options.beforeCreatedAt != null && options.beforeId != null;

    if (fetchingNewer) {
      const qb = this.activityRepo
        .createQueryBuilder('a')
        .leftJoinAndSelect('a.actor', 'actor')
        .leftJoinAndSelect('a.subjectUser', 'subjectUser')
        .where('a.channelId = :channelId', { channelId })
        .andWhere(
          '(a.createdAt > :ac OR (a.createdAt = :ac AND a.id > :aid))',
          {
            ac: options.afterCreatedAt,
            aid: options.afterId,
          },
        )
        .orderBy('a.createdAt', 'ASC')
        .addOrderBy('a.id', 'ASC')
        .take(take);

      const rawAsc = await qb.getMany();
      const hasMoreNewer = rawAsc.length >= take;
      const pageRows = hasMoreNewer ? rawAsc.slice(0, limit) : rawAsc;
      const items = await this.enrichRows(channelId, viewerId, pageRows);

      // Cursor itself (and anything before it) is older than content[0].
      const hasMoreOlder = pageRows.length > 0;

      return new Page({
        content: items,
        page: 0,
        count: limit,
        hasNext: hasMoreOlder,
        hasPrevious: hasMoreNewer,
        total: 0,
      });
    }

    const qb = this.activityRepo
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.actor', 'actor')
      .leftJoinAndSelect('a.subjectUser', 'subjectUser')
      .where('a.channelId = :channelId', { channelId })
      .orderBy('a.createdAt', 'DESC')
      .addOrderBy('a.id', 'DESC')
      .take(take);

    if (fetchingOlder) {
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
    const pageRows = (hasMoreOlder ? rawDesc.slice(0, limit) : rawDesc)
      .slice()
      .reverse();
    const items = await this.enrichRows(channelId, viewerId, pageRows);

    // Latest tip: no newer. Older page: acquiring older from a mid-window cursor
    // means there is at least the previous window toward the tip (hasPrevious=true).
    const hasMoreNewer = fetchingOlder;

    return new Page({
      content: items,
      page: 0,
      count: limit,
      hasNext: hasMoreOlder,
      hasPrevious: hasMoreNewer,
      total: 0,
    });
  }

  /**
   * Replace-window fetch centered on the message_sent activity for `messageId`.
   * Returns a contiguous ASC slice; hasNext/hasPrevious reflect more older/newer.
   */
  async findAroundMessageForChannel(
    channelId: number,
    viewerId: number,
    messageId: number,
    limit: number,
  ): Promise<IPage<IChannelActivity>> {
    await this.assertCanReadChannel(channelId, viewerId);

    // Prefer the oldest message_sent row if legacy duplicates exist for the same messageId.
    const pivot = await this.activityRepo.findOne({
      where: {
        channelId,
        messageId,
        type: 'message_sent',
      },
      relations: { actor: true, subjectUser: true },
      order: { createdAt: 'ASC', id: 'ASC' },
    });
    if (!pivot) {
      throw new MessageNotFound();
    }

    const capped = Math.min(Math.max(1, limit), 100);
    const olderTake = Math.floor((capped - 1) / 2);
    const newerTake = capped - 1 - olderTake; // remaining slots after pivot

    // Always probe +1 so hasMore* is correct even when one side of the window is empty.
    const olderQb = this.activityRepo
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.actor', 'actor')
      .leftJoinAndSelect('a.subjectUser', 'subjectUser')
      .where('a.channelId = :channelId', { channelId })
      .andWhere('(a.createdAt < :pc OR (a.createdAt = :pc AND a.id < :pid))', {
        pc: pivot.createdAt,
        pid: pivot.id,
      })
      .orderBy('a.createdAt', 'DESC')
      .addOrderBy('a.id', 'DESC')
      .take(olderTake + 1);

    const newerQb = this.activityRepo
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.actor', 'actor')
      .leftJoinAndSelect('a.subjectUser', 'subjectUser')
      .where('a.channelId = :channelId', { channelId })
      .andWhere('(a.createdAt > :pc OR (a.createdAt = :pc AND a.id > :pid))', {
        pc: pivot.createdAt,
        pid: pivot.id,
      })
      .orderBy('a.createdAt', 'ASC')
      .addOrderBy('a.id', 'ASC')
      .take(newerTake + 1);

    const [olderRaw, newerRaw] = await Promise.all([
      olderQb.getMany(),
      newerQb.getMany(),
    ]);

    const hasMoreOlder = olderRaw.length > olderTake;
    const hasMoreNewer = newerRaw.length > newerTake;
    const olderAsc = olderRaw.slice(0, olderTake).slice().reverse();
    const newerAsc = newerRaw.slice(0, newerTake);

    // Dedupe by activity id, then by messageId for message_sent (legacy duplicate rows).
    const rows = this.dedupeActivityRows([...olderAsc, pivot, ...newerAsc]);
    const items = await this.enrichRows(channelId, viewerId, rows);

    return new Page({
      content: items,
      page: 0,
      count: capped,
      hasNext: hasMoreOlder,
      hasPrevious: hasMoreNewer,
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
