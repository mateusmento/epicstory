import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import { Socket } from 'socket.io';
import {
  ChannelRepository,
  MessageRepository,
  MessageReplyRepository,
} from 'src/channel/infrastructure';
import { MessageService } from '../services/message.service';

const channelMessagingRoom = (channelId) => `channel:${channelId}:messaging`;

@WebSocketGateway()
export class MessageGateway {
  constructor(
    private messageRepo: MessageRepository,
    private messageReplyRepo: MessageReplyRepository,
    private messageService: MessageService,
    private jwtService: JwtService,
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
}
