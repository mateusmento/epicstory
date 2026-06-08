import type { MessagePollBody } from '@epicstory/contracts';
import type { JSONContent } from '@tiptap/core';
import { ScheduledJob } from 'src/scheduling/entities';
import type { ScheduledJobRecurrence } from 'src/scheduling/entities/scheduled-job.entity';
import { ScheduledJobTypes } from 'src/scheduling/constants';
import { ScheduledMessagePayload } from 'src/scheduling/types/payload';
import { UUID } from 'crypto';

/** API shape for a channel scheduled message, mapped from `ScheduledJob`. */
export class IScheduledMessage {
  id: UUID;
  channelId: number;
  senderId: number;
  content: JSONContent;
  quotedMessageId?: number;
  poll?: MessagePollBody;

  dueAt: Date;
  recurrence: ScheduledJobRecurrence;
  notifyMinutesBefore: number;
  processed: boolean;
  lastRunAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

function assertScheduledMessageJob(
  job: ScheduledJob,
): asserts job is ScheduledJob & {
  payload: ScheduledMessagePayload;
} {
  if (job.type !== ScheduledJobTypes.scheduled_message) {
    throw new Error(
      `Expected job type ${ScheduledJobTypes.scheduled_message}, got ${job.type}`,
    );
  }
  const p = job.payload as ScheduledMessagePayload;
  if (p?.type !== 'scheduled_message') {
    throw new Error('Invalid scheduled message payload');
  }
}

export function mapScheduledJobToMessage(job: ScheduledJob): IScheduledMessage {
  assertScheduledMessageJob(job);
  const p = job.payload;
  const row = new IScheduledMessage();
  row.id = job.id;
  row.channelId = p.channelId;
  row.senderId = p.senderId;
  row.content = p.content;
  row.quotedMessageId = p.quotedMessageId;
  row.poll = p.poll;
  row.dueAt = job.dueAt;
  row.recurrence = job.recurrence;
  row.notifyMinutesBefore = job.notifyMinutesBefore;
  row.processed = job.processed;
  row.lastRunAt = job.lastRunAt;
  row.createdAt = job.createdAt;
  row.updatedAt = job.updatedAt;
  return row;
}
