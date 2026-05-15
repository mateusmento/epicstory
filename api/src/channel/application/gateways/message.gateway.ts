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
import type { IChannelActivityClient } from '../dtos/channel-activity-client.dto';
import { MessageService } from '../services/message.service';
import { ReplyService } from '../services/reply.service';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories';

const channelMessagingRoom = (channelId) =>
  `channel:${channelId}:messaging` as const;
const userRoom = (userId) => `user:${userId}` as const;

@WebSocketGateway()
export class MessageGateway {
  @WebSocketServer()
  server: Server;

  constructor(
    private messageService: MessageService,
    private replyService: ReplyService,
    private channelRepo: ChannelRepository,
    private workspaceRepo: WorkspaceRepository,
  ) {}

  /**
   * @param options.includeSender — Set when the client did not already receive the message over HTTP
   * (e.g. scheduled job delivery). Default behavior excludes the sender like an optimistic send + fan-out.
   */
  emitIncomingMessage(message: Message, options?: { includeSender?: boolean }) {
    if (!this.server) return;
    const room = this.server.to(channelMessagingRoom(message.channelId));
    const target = options?.includeSender
      ? room
      : room.except(userRoom(message.senderId));
    target.emit('incoming-message', { message, channelId: message.channelId });
  }

  emitIncomingChannelActivity(
    activity: IChannelActivityClient,
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
    target.emit('incoming-channel-activity', {
      activity,
      channelId: activity.channelId,
    });
  }

  emitIncomingReply(reply: MessageReply) {
    if (!this.server) return;
    this.server
      .to(channelMessagingRoom(reply.channelId))
      .except(userRoom(reply.senderId))
      .emit('incoming-reply', {
        reply,
        messageId: reply.messageId,
        channelId: reply.channelId,
      });
  }

  emitIncomingMessageReaction(
    channelId: number,
    messageId: number,
    emoji: string,
    userId: number,
    action: string,
    reactions: { emoji: string; reactedBy: number[] }[],
  ) {
    if (!this.server) return;
    this.server
      .to(channelMessagingRoom(channelId))
      .except(userRoom(userId))
      .emit('incoming-message-reaction', {
        messageId,
        emoji,
        userId,
        action,
        reactions,
      });
  }

  emitIncomingReplyReaction(
    channelId: number,
    replyId: number,
    emoji: string,
    userId: number,
    action: string,
    reactions: { emoji: string; reactedBy: number[] }[],
  ) {
    if (!this.server) return;
    this.server
      .to(channelMessagingRoom(channelId))
      .except(userRoom(userId))
      .emit('incoming-reply-reaction', {
        replyId,
        emoji,
        userId,
        action,
        reactions,
      });
  }

  emitMessageDeleted(channelId: number, messageId: number, userId: number) {
    if (!this.server) return;
    this.server
      .to(channelMessagingRoom(channelId))
      .except(userRoom(userId))
      .emit('message-deleted', {
        messageId,
        channelId,
      });
  }

  emitMessageUpdated(
    channelId: number,
    message: Message,
    editorUserId: number,
  ) {
    if (!this.server) return;
    this.server
      .to(channelMessagingRoom(channelId))
      .except(userRoom(editorUserId))
      .emit('message-updated', { message, channelId });
  }

  emitReplyUpdated(
    channelId: number,
    reply: MessageReply,
    editorUserId: number,
  ) {
    if (!this.server) return;
    this.server
      .to(channelMessagingRoom(channelId))
      .except(userRoom(editorUserId))
      .emit('reply-updated', { reply, channelId, messageId: reply.messageId });
  }

  emitReplyDeleted(
    channelId: number,
    messageId: number,
    replyId: number,
    issuerId: number,
  ) {
    if (!this.server) return;
    this.server
      .to(channelMessagingRoom(channelId))
      .except(userRoom(issuerId))
      .emit('reply-deleted', {
        replyId,
        messageId,
        channelId,
      });
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
    this.server
      .to(channelMessagingRoom(channelId))
      .emit('message-poll-updated', {
        channelId,
        messageId,
        optionVotes: tallies.optionVotes,
        totalVotes: tallies.totalVotes,
      });
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
    @MessageBody() body: { channelId: number },
    @ConnectedSocket() socket: Socket,
  ) {
    const user = (socket.request as any).user;
    const userId = +user?.id;
    const channelId = +body?.channelId;
    if (!Number.isFinite(userId) || !Number.isFinite(channelId))
      return { ok: false };

    if (!(await this.isChannelMember(channelId, userId))) return { ok: false };

    // Use the sender socket so delivery matches `socket.to(room)` semantics
    // (notify everyone in the channel room except this socket). Avoids
    // `server.to(room).except(userRoom)` edge cases with Redis adapter / room overlap.
    socket
      .to(channelMessagingRoom(channelId))
      .emit('user-typing', { channelId, userId });

    return { ok: true };
  }

  @SubscribeMessage('channel-typing-stop')
  async channelTypingStop(
    @MessageBody() body: { channelId: number },
    @ConnectedSocket() socket: Socket,
  ) {
    const user = (socket.request as any).user;
    const userId = +user?.id;
    const channelId = +body?.channelId;
    if (!Number.isFinite(userId) || !Number.isFinite(channelId))
      return { ok: false };

    if (!(await this.isChannelMember(channelId, userId))) return { ok: false };

    socket
      .to(channelMessagingRoom(channelId))
      .emit('user-typing-stopped', { channelId, userId });

    return { ok: true };
  }

  @SubscribeMessage('subscribe-messages')
  async subscribeMessages(
    @MessageBody() body: { workspaceId: number },
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

  @SubscribeMessage('toggle-reaction')
  async toggleReaction(
    @MessageBody() { messageId, messageReplyId, emoji, channelId }: any,
    @ConnectedSocket() socket: Socket,
  ) {
    const user = (socket.request as any).user;
    const userId = +user?.id;
    if (!Number.isFinite(userId)) return { ok: false };

    if (!(await this.isChannelMember(channelId, userId))) return { ok: false };

    if (messageReplyId) {
      // Toggle reaction on a message reply
      await this.replyService.toggleReplyReaction(
        messageReplyId,
        emoji,
        userId,
      );

      const reactions = await this.replyService.findReplyReactions(
        messageReplyId,
        userId,
      );

      socket.to(channelMessagingRoom(channelId)).emit('incoming-reaction', {
        messageReplyId,
        emoji,
        userId,
        reactions,
      });

      socket.emit('incoming-reaction', {
        messageReplyId,
        emoji,
        userId,
        reactions,
      });

      return { messageReplyId, emoji, userId, reactions };
    } else if (messageId) {
      // Toggle reaction on a message
      await this.messageService.toggleMessageReaction(messageId, emoji, userId);

      const reactions = await this.messageService.findMessageReactions(
        messageId,
        userId,
      );

      socket.to(channelMessagingRoom(channelId)).emit('incoming-reaction', {
        messageId,
        emoji,
        userId,
        reactions,
      });

      socket.emit('incoming-reaction', {
        messageId,
        emoji,
        userId,
        reactions,
      });

      return { messageId, emoji, userId, reactions };
    }
  }
}
