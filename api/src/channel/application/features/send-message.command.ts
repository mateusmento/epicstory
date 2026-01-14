import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { WebSocketServer } from '@nestjs/websockets';
import { IsNotEmpty, IsString } from 'class-validator';
import { Server } from 'socket.io';
import { UserRepository } from 'src/auth';
import {
  ChannelRepository,
  MessageRepository,
} from 'src/channel/infrastructure';
import { patch } from 'src/core/objects';
import { MessageService } from '../services/message.service';

const channelMessagingRoom = (channelId) => `channel:${channelId}:messaging`;

export class SendMessage {
  channelId: number;
  senderId: number;

  @IsNotEmpty()
  @IsString()
  content: string;

  constructor(data: Partial<SendMessage>) {
    patch(this, data);
  }
}

@CommandHandler(SendMessage)
export class SendMessageCommand implements ICommandHandler<SendMessage> {
  @WebSocketServer()
  server: Server;

  constructor(
    private channelRepo: ChannelRepository,
    private messageRepo: MessageRepository,
    private messageService: MessageService,
    private userRepo: UserRepository,
  ) {}

  async execute({ channelId, senderId, content }: SendMessage) {
    const sender = await this.userRepo.findOne({ where: { id: senderId } });
    if (!sender) {
      throw new Error('Sender not found');
    }

    const channel = await this.channelRepo.findOne({
      where: { id: channelId },
    });
    if (!channel) {
      throw new Error('Channel not found');
    }

    const { id } = await this.messageService.createMessage(
      content,
      channelId,
      senderId,
    );
    const loadedMessage = await this.messageRepo.findOne({
      where: { id },
      relations: { sender: true },
    });

    this.server
      .to(channelMessagingRoom(channelId))
      .emit('incoming-message', { message: loadedMessage, channelId });

    return loadedMessage;
  }
}
