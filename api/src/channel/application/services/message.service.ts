import { Injectable } from '@nestjs/common';
import {
  ChannelRepository,
  MessageRepository,
  MessageReplyRepository,
} from 'src/channel/infrastructure';

@Injectable()
export class MessageService {
  constructor(
    private messageRepo: MessageRepository,
    private messageReplyRepo: MessageReplyRepository,
    private channelRepo: ChannelRepository,
  ) {}

  async findMessages(channelId: number) {
    return this.messageRepo.find({
      where: { channelId: channelId },
      relations: { sender: true },
      order: { sentAt: 'asc' },
    });
  }

  async createMessage(content: string, channelId: number, senderId: number) {
    const message = await this.messageRepo.save({
      content,
      channelId,
      senderId,
    });
    this.channelRepo.update({ id: channelId }, { lastMessageId: message.id });
    return message;
  }

  async createReply(content: string, messageId: number, senderId: number) {
    return this.messageReplyRepo.save({
      content,
      messageId,
      senderId,
    });
  }

  async findReplies(messageId: number) {
    return this.messageReplyRepo.find({
      where: { messageId },
      relations: { sender: true },
      order: { sentAt: 'asc' },
    });
  }
}
