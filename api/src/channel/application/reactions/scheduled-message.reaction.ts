import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { CommandBus } from '@nestjs/cqrs';
import { ScheduledJobTypes } from 'src/scheduling/constants';
import {
  ScheduledMessagePayload,
  ScheduledJobWithPayload,
} from 'src/scheduling/types/payload';
import { SendMessage } from '../features/send-message.command';

@Injectable()
export class ScheduledMessageReaction {
  constructor(private commandBus: CommandBus) {}

  @OnEvent(`scheduled-job.${ScheduledJobTypes.scheduled_message}`, {
    async: true,
  })
  async handle(job: ScheduledJobWithPayload<ScheduledMessagePayload>) {
    const p = job.payload;
    if (p.type !== 'scheduled_message') return;

    /** Attachment linking is intentionally omitted for scheduled delivery (staging TTL). */
    await this.commandBus.execute(
      new SendMessage({
        channelId: p.channelId,
        senderId: p.senderId,
        content: p.content,
        quotedMessageId: p.quotedMessageId,
        markAsScheduled: true,
        ...(p.poll != null ? { poll: p.poll } : {}),
      }),
    );
  }
}
