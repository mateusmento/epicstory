import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import type { JSONContent } from '@tiptap/core';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  Min,
  ValidateNested,
} from 'class-validator';
import { ChannelRepository } from 'src/channel/infrastructure';
import { patch } from 'src/core/objects';
import { ScheduledJobTypes } from 'src/scheduling/constants';
import { ScheduledJob } from 'src/scheduling/entities';
import type { ScheduledJobRecurrence } from 'src/scheduling/entities/scheduled-job.entity';
import { ScheduledJobRepository } from 'src/scheduling/repositories';
import { ScheduledMessagePayload } from 'src/scheduling/types/payload';
import {
  AttachmentReferencesService,
  attachmentAnchorKey,
} from '../services/attachment-references.service';
import { IssuerUserIsNotWorkspaceMember } from 'src/workspace/domain/exceptions';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories';
import { MessagePollBody } from '../dtos/message-poll.dto';
import {
  IScheduledMessage,
  mapScheduledJobToMessage,
} from '../dtos/scheduled-message.dto';
import { ChannelNotFound, SenderIsNotChannelMember } from '../exceptions';
import { MessageDraftService } from '../services/message-draft.service';
import { Transactional } from 'typeorm-transactional';

export class ScheduleChannelMessage {
  channelId: number;
  senderId: number;

  @IsNotEmpty()
  @IsObject()
  content: JSONContent;

  @IsOptional()
  @IsInt()
  @Min(1)
  quotedMessageId?: number;

  dueAt: Date;

  recurrence: ScheduledJobRecurrence;

  @IsOptional()
  @ValidateNested()
  @Type(() => MessagePollBody)
  poll?: MessagePollBody;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  attachmentIds?: number[];

  constructor(data: Partial<ScheduleChannelMessage>) {
    patch(this, data);
  }
}

@CommandHandler(ScheduleChannelMessage)
export class ScheduleChannelMessageCommand
  implements ICommandHandler<ScheduleChannelMessage>
{
  constructor(
    private channelRepo: ChannelRepository,
    private workspaceRepo: WorkspaceRepository,
    private scheduledJobRepo: ScheduledJobRepository,
    private attachmentRefs: AttachmentReferencesService,
    private messageDrafts: MessageDraftService,
  ) {}

  @Transactional()
  async execute(cmd: ScheduleChannelMessage): Promise<IScheduledMessage> {
    const channel = await this.channelRepo.findOne({
      where: { id: cmd.channelId },
      relations: { peers: true },
    });
    if (!channel) throw new ChannelNotFound();

    const issuerMember = await this.workspaceRepo.findMember(
      channel.workspaceId,
      cmd.senderId,
    );
    if (!issuerMember) throw new IssuerUserIsNotWorkspaceMember();

    const peerIds = channel.peers.map((p) => p.id);
    if (!peerIds.includes(cmd.senderId)) throw new SenderIsNotChannelMember();

    const payload = new ScheduledMessagePayload({
      channelId: cmd.channelId,
      senderId: cmd.senderId,
      content: cmd.content,
      quotedMessageId: cmd.quotedMessageId,
      ...(cmd.poll != null ? { poll: cmd.poll } : {}),
    });

    const job = ScheduledJob.create({
      type: ScheduledJobTypes.scheduled_message,
      workspaceId: channel.workspaceId,
      payload,
      dueAt: cmd.dueAt,
      notifyMinutesBefore: 0,
      recurrence: cmd.recurrence,
    });

    const saved = await this.scheduledJobRepo.save(job);

    const anchor = { type: 'scheduled' as const, scheduledJobId: saved.id };
    await this.attachmentRefs.commit({
      workspaceId: channel.workspaceId,
      channelId: channel.id,
      actor: { uploadedById: cmd.senderId },
      ops: [
        {
          op: 'sync',
          anchor,
          attachmentIds: cmd.attachmentIds ?? [],
        },
      ],
    });

    await this.messageDrafts.delete({
      channelId: channel.id,
      authorId: cmd.senderId,
      threadMessageId: null,
    });

    const { byAnchor } = await this.attachmentRefs.load({
      workspaceId: channel.workspaceId,
      anchors: [anchor],
    });
    return mapScheduledJobToMessage(
      saved,
      byAnchor.get(attachmentAnchorKey(anchor)) ?? [],
    );
  }
}
