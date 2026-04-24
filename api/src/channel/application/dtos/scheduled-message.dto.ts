import { ScheduledJob } from 'src/scheduling/entities';
import type { ScheduledJobRecurrence } from 'src/scheduling/entities/scheduled-job.entity';
import { ScheduledJobTypes } from 'src/scheduling/constants';
import { ScheduledMessagePayload } from 'src/scheduling/types/payload';
import { UUID } from 'crypto';

/** API shape for a channel scheduled message, mapped from `ScheduledJob`. */
export class ScheduledMessageDto {
  id: UUID;
  channelId: number;
  senderId: number;
  content: string;
  contentRich?: any;
  quotedMessageId?: number;

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

export function toScheduledMessageDto(job: ScheduledJob): ScheduledMessageDto {
  assertScheduledMessageJob(job);
  const p = job.payload;
  const dto = new ScheduledMessageDto();
  dto.id = job.id;
  dto.channelId = p.channelId;
  dto.senderId = p.senderId;
  dto.content = p.content;
  dto.contentRich = p.contentRich;
  dto.quotedMessageId = p.quotedMessageId;
  dto.dueAt = job.dueAt;
  dto.recurrence = job.recurrence;
  dto.notifyMinutesBefore = job.notifyMinutesBefore;
  dto.processed = job.processed;
  dto.lastRunAt = job.lastRunAt;
  dto.createdAt = job.createdAt;
  dto.updatedAt = job.updatedAt;
  return dto;
}
