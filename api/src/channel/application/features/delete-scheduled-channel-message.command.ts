import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ChannelRepository } from 'src/channel/infrastructure';
import { patch } from 'src/core/objects';
import { ScheduledMessagePayload } from 'src/scheduling/types/payload';
import { ScheduledJobRepository } from 'src/scheduling/repositories';
import { IssuerUserIsNotWorkspaceMember } from 'src/workspace/domain/exceptions';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories';
import { ChannelNotFound, SenderIsNotChannelMember } from '../exceptions';

export class DeleteScheduledChannelMessage {
  scheduledMessageId: string;
  channelId: number;
  issuerId: number;

  constructor(data: Partial<DeleteScheduledChannelMessage>) {
    patch(this, data);
  }
}

@CommandHandler(DeleteScheduledChannelMessage)
export class DeleteScheduledChannelMessageCommand
  implements ICommandHandler<DeleteScheduledChannelMessage>
{
  constructor(
    private channelRepo: ChannelRepository,
    private workspaceRepo: WorkspaceRepository,
    private scheduledJobRepo: ScheduledJobRepository,
  ) {}

  async execute(
    cmd: DeleteScheduledChannelMessage,
  ): Promise<{ success: true }> {
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
        'You can only delete your own scheduled messages',
      );
    }

    await this.scheduledJobRepo.remove(job);
    return { success: true };
  }
}
