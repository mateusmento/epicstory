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
} from 'src/channel/infrastructure';
import { MessageService } from '../services/message.service';

const channelMessagingRoom = (channelId) => `channel:${channelId}:messaging`;

@WebSocketGateway()
export class MessageGateway {
  constructor(
    private messageRepo: MessageRepository,
    private messageService: MessageService,
    private jwtService: JwtService,
    private channelRepo: ChannelRepository,
  ) {}

  @SubscribeMessage('subscribe-messages')
  async subscribeMessages(
    @MessageBody() { workspaceId, userId }: any,
    @ConnectedSocket() socket: Socket,
  ) {
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
    @MessageBody() { channelId, message, broadcastSelf }: any,
    @ConnectedSocket() socket: Socket,
  ) {
    const token = socket.request.headers.authorization;
    const user = await this.jwtService.verifyAsync(token);
    const { id } = await this.messageService.createMessage(
      message.content,
      channelId,
      user.id,
    );
    message = await this.messageRepo.findOne({
      where: { id },
      relations: { sender: true },
    });
    socket
      .to(channelMessagingRoom(channelId))
      .emit('incoming-message', { message, channelId });
    if (broadcastSelf) socket.emit('incoming-message', { message, channelId });
    return message;
  }
}
