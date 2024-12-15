import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { MessageService } from '../services/message.service';
import { MessageRepository } from 'src/channel/infrastructure';

@WebSocketGateway()
export class ChannelGateway {
  constructor(
    private messageRepo: MessageRepository,
    private messageService: MessageService,
    private jwtService: JwtService,
  ) {}

  @SubscribeMessage('join-channel')
  joinChannel(
    @MessageBody() { channelId }: any,
    @ConnectedSocket() socket: Socket,
  ) {
    socket.join(`channel:${channelId}`);
  }

  @SubscribeMessage('send-message')
  async sendMessage(
    @MessageBody() { channelId, message }: any,
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
    socket.to(`channel:${channelId}`).emit('receive-message', message);
    return message;
  }
}
