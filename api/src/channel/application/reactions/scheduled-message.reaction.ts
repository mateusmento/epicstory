import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { CommandBus } from '@nestjs/cqrs';
import { ScheduledJobTypes } from 'src/scheduling/constants';
import {
  ScheduledMessagePayload,
  ScheduledJobWithPayload,
} from 'src/scheduling/types/payload';
import { AttachmentReferencesService } from '../services/attachment-references.service';
import { SendMessage } from '../features/send-message.command';

@Injectable()
export class ScheduledMessageReaction {
  constructor(
    private commandBus: CommandBus,
    private attachmentRefs: AttachmentReferencesService,
  ) {}

  @OnEvent(`scheduled-job.${ScheduledJobTypes.scheduled_message}`, {
    async: true,
  })
  async handle(job: ScheduledJobWithPayload<ScheduledMessagePayload>) {
    const p = job.payload;
    if (p.type !== 'scheduled_message') return;

    const { byAnchor } = await this.attachmentRefs.load({
      workspaceId: job.workspaceId,
      anchors: [{ type: 'scheduled', scheduledJobId: job.id }],
    });
    const attachmentIds =
      byAnchor.get(`scheduled:${job.id}`)?.map((a) => a.id) ?? [];

    await this.commandBus.execute(
      new SendMessage({
        channelId: p.channelId,
        senderId: p.senderId,
        content: p.content,
        quotedMessageId: p.quotedMessageId,
        markAsScheduled: true,
        attachmentIds,
        ...(p.poll != null ? { poll: p.poll } : {}),
      }),
    );

    // Once jobs keep the row as processed; drop template joins so GC can run
    // if nothing else references the files (message joins remain).
    if ((job.recurrence?.frequency ?? 'once') === 'once') {
      await this.attachmentRefs.commit({
        workspaceId: job.workspaceId,
        channelId: p.channelId,
        actor: { uploadedById: p.senderId, trustedDelivery: true },
        ops: [
          {
            op: 'release',
            anchor: { type: 'scheduled', scheduledJobId: job.id },
          },
        ],
      });
    }
  }
}
