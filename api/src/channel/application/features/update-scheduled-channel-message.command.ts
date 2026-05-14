import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { ChannelRepository } from 'src/channel/infrastructure';
import type { JSONContent } from '@tiptap/core';
import { patch } from 'src/core/objects';
import { ScheduledMessagePayload } from 'src/scheduling/types/payload';
import { ScheduledJobRepository } from 'src/scheduling/repositories';
import type { ScheduledJobRecurrence } from 'src/scheduling/entities/scheduled-job.entity';
import { IssuerUserIsNotWorkspaceMember } from 'src/workspace/domain/exceptions';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories';
import { MessagePollBody } from '../dtos/message-poll.dto';
import {
  IScheduledMessage,
  mapScheduledJobToMessage,
} from '../dtos/scheduled-message.dto';
import { ChannelNotFound, SenderIsNotChannelMember } from '../exceptions';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

export class UpdateScheduledChannelMessage {
  scheduledMessageId: string;
  channelId: number;
  issuerId: number;

  @IsOptional()
  @IsNotEmpty()
  @IsObject()
  content?: JSONContent;

  @IsOptional()
  @IsInt()
  @Min(1)
  quotedMessageId?: number | null;

  @IsOptional()
  dueAt?: Date;

  @IsOptional()
  recurrence?: ScheduledJobRecurrence;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @ValidateNested()
  @Type(() => MessagePollBody)
  poll?: MessagePollBody | null;

  constructor(data: Partial<UpdateScheduledChannelMessage>) {
    patch(this, data);
  }
}

@CommandHandler(UpdateScheduledChannelMessage)
export class UpdateScheduledChannelMessageCommand
  implements ICommandHandler<UpdateScheduledChannelMessage>
{
  constructor(
    private channelRepo: ChannelRepository,
    private workspaceRepo: WorkspaceRepository,
    private scheduledJobRepo: ScheduledJobRepository,
  ) {}

  async execute(
    cmd: UpdateScheduledChannelMessage,
  ): Promise<IScheduledMessage> {
    const channel = await this.channelRepo.findOne({
      where: { id: cmd.channelId },
      relations: { peers: true },
    });
    if (!channel) throw new ChannelNotFound();

    const issuerMember = await this.workspaceRepo.findMember(
      channel.workspaceId,
      cmd.issuerId,
    );
    if (!issuerMember) throw new IssuerUserIsNotWorkspaceMember();

    const peerIds = channel.peers.map((p) => p.id);
    if (!peerIds.includes(cmd.issuerId)) throw new SenderIsNotChannelMember();

    const job =
      await this.scheduledJobRepo.findScheduledMessageByIdForWorkspace({
        id: cmd.scheduledMessageId,
        workspaceId: channel.workspaceId,
      });
    if (!job) {
      throw new NotFoundException('Scheduled message not found');
    }

    const payload = job.payload as ScheduledMessagePayload;
    if (payload.channelId !== cmd.channelId) {
      throw new NotFoundException('Scheduled message not found');
    }
    if (payload.senderId !== cmd.issuerId) {
      throw new ForbiddenException(
        'You can only edit your own scheduled messages',
      );
    }
    if (job.processed) {
      throw new ForbiddenException('Scheduled message can no longer be edited');
    }

    const nextPoll =
      cmd.poll !== undefined
        ? cmd.poll === null
          ? undefined
          : cmd.poll
        : payload.poll;

    const nextPayload = new ScheduledMessagePayload({
      ...payload,
      content: cmd.content ?? payload.content,
      quotedMessageId:
        cmd.quotedMessageId !== undefined
          ? (cmd.quotedMessageId ?? undefined)
          : payload.quotedMessageId,
      poll: nextPoll,
    });

    job.payload = nextPayload;
    if (cmd.dueAt) job.dueAt = cmd.dueAt;
    if (cmd.recurrence) job.recurrence = cmd.recurrence;

    const saved = await this.scheduledJobRepo.save(job);
    return mapScheduledJobToMessage(saved);
  }
}
