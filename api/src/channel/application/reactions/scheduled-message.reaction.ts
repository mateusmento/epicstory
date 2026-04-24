import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { CommandBus } from '@nestjs/cqrs';
import { ScheduledJobTypes } from 'src/scheduling/constants';
import {
  ScheduledMessagePayload,
  ScheduledJobWithPayload,
} from 'src/scheduling/types/payload';
import { SendMessage } from '../features/send-message.command';
import { MessageGateway } from '../gateways/message.gateway';

@Injectable()
export class ScheduledMessageReaction {
  constructor(
    private commandBus: CommandBus,
    private messageGateway: MessageGateway,
  ) {}

  @OnEvent(`scheduled-job.${ScheduledJobTypes.scheduled_message}`, {
    async: true,
  })
  async handle(job: ScheduledJobWithPayload<ScheduledMessagePayload>) {
    const p = job.payload;
    if (p.type !== 'scheduled_message') return;

    const message = await this.commandBus.execute(
      new SendMessage({
        channelId: p.channelId,
        senderId: p.senderId,
        content: p.content,
        contentRich: p.contentRich,
        quotedMessageId: p.quotedMessageId,
        markAsScheduled: true,
      }),
    );

    this.messageGateway.emitIncomingMessage(message, { includeSender: true });
  }
}
