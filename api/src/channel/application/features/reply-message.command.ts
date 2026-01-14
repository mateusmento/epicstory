import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { MessageReplyRepository } from 'src/channel/infrastructure';
import { MessageService } from '../services/message.service';

const channelMessagingRoom = (channelId) => `channel:${channelId}:messaging`;

export class ReplyMessage {
  channelId: number;
  userId: number;
  message: { content: string };
  parentMessageId: number;
}

@CommandHandler(ReplyMessage)
export class ReplyMessageCommand implements ICommandHandler<ReplyMessage> {
  @WebSocketServer()
  server: Server;

  constructor(
    private messageReplyRepo: MessageReplyRepository,
    private messageService: MessageService,
  ) {}

  async execute({ channelId, userId, message, parentMessageId }: ReplyMessage) {
    const reply = await this.messageService.createReply(
      message.content,
      parentMessageId,
      userId,
    );

    const loadedReply = await this.messageReplyRepo.findOne({
      where: { id: reply.id },
      relations: { sender: true },
    });

    this.server.to(channelMessagingRoom(channelId)).emit('incoming-reply', {
      message: loadedReply,
      parentMessageId,
      channelId,
    });

    return loadedReply;
  }
}
