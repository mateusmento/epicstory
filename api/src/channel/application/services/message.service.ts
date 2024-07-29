import { Injectable } from '@nestjs/common';
import {
  ChannelRepository,
  MessageRepository,
} from 'src/channel/infrastructure';

@Injectable()
export class MessageService {
  constructor(
    private messageRepo: MessageRepository,
    private channelRepo: ChannelRepository,
  ) {}

  async findMessages(channelId: number) {
    return this.messageRepo.find({
      where: { channelId: channelId },
      relations: { speaker: true },
    });
  }

  async createMessage(text: string, channelId: number, speakerId: number) {
    const message = await this.messageRepo.save({ text, channelId, speakerId });
    this.channelRepo.update({ id: channelId }, { lastMessageId: message.id });
    return message;
  }
}
