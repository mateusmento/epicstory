import type {
  ChannelTypingPulseBody,
  IAggregatedReaction,
  IChannelActivity,
  IMessage,
  IncomingChannelActivityEvent,
  IncomingMessageReactionEvent,
  IncomingReplyEvent,
  IncomingReplyReactionEvent,
  IReply,
  MessageDeletedEvent,
  MessagePollUpdatedEvent,
  MessageUpdatedEvent,
  ReactionToggleAction,
  ReplyDeletedEvent,
  ReplyUpdatedEvent,
  SubscribeMessagesBody,
  UserTypingEvent,
  UserTypingStoppedEvent,
} from '@epicstory/contracts';
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Message } from 'src/channel/domain';
import { MessageReply } from 'src/channel/domain/entities';
import { ChannelRepository } from 'src/channel/infrastructure';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories';

const channelMessagingRoom = (channelId) =>
  `channel:${channelId}:messaging` as const;
const userRoom = (userId) => `user:${userId}` as const;

@WebSocketGateway()
export class MessageGateway {
  @WebSocketServer()
  server: Server;

  constructor(
    private channelRepo: ChannelRepository,
    private workspaceRepo: WorkspaceRepository,
  ) {}

  emitIncomingChannelActivity(
    activity: IChannelActivity,
    options?: { excludeUserId?: number; includeIssuer?: boolean },
  ) {
    if (!this.server) return;
    const room = this.server.to(channelMessagingRoom(activity.channelId));
    const target =
      options?.includeIssuer === true
        ? room
        : options?.excludeUserId != null
          ? room.except(userRoom(options.excludeUserId))
          : room;
    const payload = {
      activity,
      channelId: activity.channelId,
    } satisfies IncomingChannelActivityEvent;
    target.emit('incoming-channel-activity', payload);
  }

  emitIncomingReply(reply: MessageReply) {
    if (!this.server) return;
    const payload: IncomingReplyEvent = {
      reply: reply as unknown as IReply,
      messageId: reply.messageId,
      channelId: reply.channelId,
    };
    this.server
      .to(channelMessagingRoom(reply.channelId))
      .except(userRoom(reply.senderId))
      .emit('incoming-reply', payload);
  }

  emitIncomingMessageReaction(
    channelId: number,
    messageId: number,
    emoji: string,
    userId: number,
    action: ReactionToggleAction,
    reactions: IAggregatedReaction[],
  ) {
    if (!this.server) return;
    const payload = {
      messageId,
      emoji,
      userId,
      action,
      reactions,
    } satisfies IncomingMessageReactionEvent;
    this.server
      .to(channelMessagingRoom(channelId))
      .except(userRoom(userId))
      .emit('incoming-message-reaction', payload);
  }

  emitIncomingReplyReaction(
    channelId: number,
    replyId: number,
    emoji: string,
    userId: number,
    action: ReactionToggleAction,
    reactions: IAggregatedReaction[],
  ) {
    if (!this.server) return;
    const payload = {
      replyId,
      emoji,
      userId,
      action,
      reactions,
    } satisfies IncomingReplyReactionEvent;
    this.server
      .to(channelMessagingRoom(channelId))
      .except(userRoom(userId))
      .emit('incoming-reply-reaction', payload);
  }

  emitMessageDeleted(channelId: number, messageId: number, userId: number) {
    if (!this.server) return;
    const payload = {
      messageId,
      channelId,
    } satisfies MessageDeletedEvent;
    this.server
      .to(channelMessagingRoom(channelId))
      .except(userRoom(userId))
      .emit('message-deleted', payload);
  }

  emitMessageUpdated(
    channelId: number,
    message: Message,
    editorUserId: number,
  ) {
    if (!this.server) return;
    const payload: MessageUpdatedEvent = {
      message: message as unknown as IMessage,
      channelId,
    };
    this.server
      .to(channelMessagingRoom(channelId))
      .except(userRoom(editorUserId))
      .emit('message-updated', payload);
  }

  emitReplyUpdated(
    channelId: number,
    reply: MessageReply,
    editorUserId: number,
  ) {
    if (!this.server) return;
    const payload: ReplyUpdatedEvent = {
      reply: reply as unknown as IReply,
      channelId,
      messageId: reply.messageId,
    };
    this.server
      .to(channelMessagingRoom(channelId))
      .except(userRoom(editorUserId))
      .emit('reply-updated', payload);
  }

  emitReplyDeleted(
    channelId: number,
    messageId: number,
    replyId: number,
    issuerId: number,
  ) {
    if (!this.server) return;
    const payload = {
      replyId,
      messageId,
      channelId,
    } satisfies ReplyDeletedEvent;
    this.server
      .to(channelMessagingRoom(channelId))
      .except(userRoom(issuerId))
      .emit('reply-deleted', payload);
  }

  emitMessagePollUpdated(
    channelId: number,
    messageId: number,
    tallies: {
      optionVotes: Record<string, number>;
      totalVotes: number;
    },
  ) {
    if (!this.server) return;
    const payload = {
      channelId,
      messageId,
      optionVotes: tallies.optionVotes,
      totalVotes: tallies.totalVotes,
    } satisfies MessagePollUpdatedEvent;
    this.server
      .to(channelMessagingRoom(channelId))
      .emit('message-poll-updated', payload);
  }

  async isChannelMember(channelId: number, userId: number) {
    const channel = await this.channelRepo.findChannelUserIsMember(
      channelId,
      userId,
    );
    if (!channel) return false;

    if (!(await this.workspaceRepo.isMember(channel.workspaceId, userId)))
      return false;
    return true;
  }

  @SubscribeMessage('channel-typing-pulse')
  async channelTypingPulse(
    @MessageBody() body: ChannelTypingPulseBody,
    @ConnectedSocket() socket: Socket,
  ) {
    const user = (socket.request as any).user;
    const userId = +user?.id;
    const channelId = +body?.channelId;
    if (!Number.isFinite(userId) || !Number.isFinite(channelId))
      return { ok: false };

    if (!(await this.isChannelMember(channelId, userId))) return { ok: false };

    const payload = { channelId, userId } satisfies UserTypingEvent;
    socket.to(channelMessagingRoom(channelId)).emit('user-typing', payload);

    return { ok: true };
  }

  @SubscribeMessage('channel-typing-stop')
  async channelTypingStop(
    @MessageBody() body: ChannelTypingPulseBody,
    @ConnectedSocket() socket: Socket,
  ) {
    const user = (socket.request as any).user;
    const userId = +user?.id;
    const channelId = +body?.channelId;
    if (!Number.isFinite(userId) || !Number.isFinite(channelId))
      return { ok: false };

    if (!(await this.isChannelMember(channelId, userId))) return { ok: false };

    const payload = { channelId, userId } satisfies UserTypingStoppedEvent;
    socket
      .to(channelMessagingRoom(channelId))
      .emit('user-typing-stopped', payload);

    return { ok: true };
  }

  @SubscribeMessage('subscribe-messages')
  async subscribeMessages(
    @MessageBody() body: SubscribeMessagesBody,
    @ConnectedSocket() socket: Socket,
  ) {
    const user = (socket.request as any).user;
    const userId = +user?.id;
    const workspaceId = +body?.workspaceId;

    if (!Number.isFinite(userId) || !Number.isFinite(workspaceId))
      return { ok: false };

    const channels = await this.channelRepo.findChannelsUserIsMember(
      userId,
      workspaceId,
    );

    socket.leave(userRoom(userId));
    socket.join(userRoom(userId));

    for (const channel of channels) {
      socket.leave(channelMessagingRoom(channel.id));
      socket.join(channelMessagingRoom(channel.id));
    }
  }
}
