import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { MessageService } from '../services/message.service';

@WebSocketGateway()
export class ChannelGateway {
  constructor(
    private channelService: MessageService,
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
    message = await this.channelService.createMessage(
      message.content,
      channelId,
      user.id,
    );
    socket.to(`channel:${channelId}`).emit('receive-message', message);
    return message;
  }
}
