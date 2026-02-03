import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { IsNotEmpty, IsString } from 'class-validator';
import {
  MessageReplyRepository,
  MessageRepository,
} from 'src/channel/infrastructure';
import { patch } from 'src/core/objects';
import { MessageNotFound } from '../exceptions';

export class ReplyMessage {
  messageId: number;
  senderId: number;

  @IsNotEmpty()
  @IsString()
  content: string;

  constructor(data: Partial<ReplyMessage> = {}) {
    patch(this, data);
  }
}

@CommandHandler(ReplyMessage)
export class ReplyMessageCommand implements ICommandHandler<ReplyMessage> {
  constructor(
    private messageReplyRepo: MessageReplyRepository,
    private messageRepo: MessageRepository,
  ) {}

  async execute({ senderId, content, messageId }: ReplyMessage) {
    const message = await this.messageRepo.findOne({
      where: { id: messageId },
    });
    if (!message) throw new MessageNotFound();

    const { id: replyId } = await this.messageReplyRepo.save({
      content,
      channelId: message.channelId,
      messageId,
      senderId,
      sentAt: new Date(),
    });

    const reply = await this.messageReplyRepo.findOne({
      where: { id: replyId },
      relations: { sender: true, allReactions: { user: true } },
    });

    reply.setReactions(senderId);

    return reply;
  }
}
