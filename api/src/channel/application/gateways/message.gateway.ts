import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import { Socket } from 'socket.io';
import {
  ChannelRepository,
  MessageReplyRepository,
  MessageRepository,
} from 'src/channel/infrastructure';
import { MessageService } from '../services/message.service';

const channelMessagingRoom = (channelId) => `channel:${channelId}:messaging`;

@WebSocketGateway()
export class MessageGateway {
  constructor(
    private messageRepo: MessageRepository,
    private messageReplyRepo: MessageReplyRepository,
    private messageService: MessageService,
    private channelRepo: ChannelRepository,
  ) {}

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

    for (const channel of channels) {
      socket.leave(channelMessagingRoom(channel.id));
      socket.join(channelMessagingRoom(channel.id));
    }
  }

  @SubscribeMessage('send-message')
  async sendMessage(
    @MessageBody() { channelId, message, broadcastSelf, parentMessageId }: any,
    @ConnectedSocket() socket: Socket,
  ) {
    const user = (socket.request as any).user;
    if (parentMessageId) {
      // Create a reply in the separate replies table
      const reply = await this.messageService.createReply(
        message.content,
        parentMessageId,
        user.id,
      );

      const loadedReply = await this.messageReplyRepo.findOne({
        where: { id: reply.id },
        relations: { sender: true },
      });

      socket.to(channelMessagingRoom(channelId)).emit('incoming-reply', {
        message: loadedReply,
        parentMessageId,
        channelId,
      });

      if (broadcastSelf) {
        socket.emit('incoming-reply', {
          message: loadedReply,
          parentMessageId,
          channelId,
        });
      }

      return loadedReply;
    } else {
      // Regular channel message
      const { id } = await this.messageService.createMessage(
        message.content,
        channelId,
        user.id,
      );
      const loadedMessage = await this.messageRepo.findOne({
        where: { id },
        relations: { sender: true },
      });

      socket
        .to(channelMessagingRoom(channelId))
        .emit('incoming-message', { message: loadedMessage, channelId });
      if (broadcastSelf) {
        socket.emit('incoming-message', { message: loadedMessage, channelId });
      }

      return loadedMessage;
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
      await this.messageService.toggleMessageReplyReaction(
        messageReplyId,
        emoji,
        userId,
      );

      const reactions =
        await this.messageService.findMessageReplyReactions(messageReplyId);

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

      const reactions =
        await this.messageService.findMessageReactions(messageId);

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

  @SubscribeMessage('delete-message')
  async deleteMessage(
    @MessageBody() { messageId, channelId }: any,
    @ConnectedSocket() socket: Socket,
  ) {
    const user = (socket.request as any).user;
    const userId = user?.id;

    await this.messageService.deleteMessage(messageId, userId);

    socket.to(channelMessagingRoom(channelId)).emit('message-deleted', {
      messageId,
      channelId,
    });

    socket.emit('message-deleted', {
      messageId,
      channelId,
    });

    return { success: true, messageId };
  }

  @SubscribeMessage('delete-reply')
  async deleteReply(
    @MessageBody() { replyId, messageId, channelId }: any,
    @ConnectedSocket() socket: Socket,
  ) {
    const user = (socket.request as any).user;
    const userId = user?.id;

    await this.messageService.deleteReply(replyId, userId);

    socket.to(channelMessagingRoom(channelId)).emit('reply-deleted', {
      replyId,
      messageId,
      channelId,
    });

    socket.emit('reply-deleted', {
      replyId,
      messageId,
      channelId,
    });

    return { success: true, replyId };
  }
}
