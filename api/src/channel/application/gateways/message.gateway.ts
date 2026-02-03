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
import { MessageService } from '../services/message.service';

const channelMessagingRoom = (channelId) => `channel:${channelId}:messaging`;
const userRoom = (userId) => `user:${userId}`;

@WebSocketGateway()
export class MessageGateway {
  @WebSocketServer()
  server: Server;

  constructor(
    private messageService: MessageService,
    private channelRepo: ChannelRepository,
  ) {}

  emitIncomingMessage(message: Message) {
    if (!this.server) return;
    this.server
      .to(channelMessagingRoom(message.channelId))
      .except(userRoom(message.senderId))
      .emit('incoming-message', { message, channelId: message.channelId });
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

  @SubscribeMessage('subscribe-messages')
  async subscribeMessages(
    @MessageBody() { workspaceId }: any,
    @ConnectedSocket() socket: Socket,
  ) {
    const user = (socket.request as any).user;
    const userId = user?.id;

    const channels = await this.channelRepo
      .createQueryBuilder('channel')
      .innerJoin('channel.peers', 'peer')
      .where('peer.id = :userId', { userId })
      .where('channel.workspaceId = :workspaceId', { workspaceId })
      .getMany();

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
    const userId = user?.id;

    if (messageReplyId) {
      // Toggle reaction on a message reply
      await this.messageService.toggleReplyReaction(
        messageReplyId,
        emoji,
        userId,
      );

      const reactions = await this.messageService.findReplyReactions(
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
