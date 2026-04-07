import { NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { IsNumber } from 'class-validator';
import { ChannelRepository } from 'src/channel/infrastructure/repositories';
import { patch } from 'src/core/objects';
import { IssuerUserIsNotWorkspaceMember } from 'src/workspace/domain/exceptions';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories';

export class DeleteChannel {
  @IsNumber()
  channelId: number;

  @IsNumber()
  issuerId: number;

  constructor(data: Partial<DeleteChannel> = {}) {
    patch(this, data);
  }
}

@CommandHandler(DeleteChannel)
export class DeleteChannelCommand implements ICommandHandler<DeleteChannel> {
  constructor(
    private channelRepo: ChannelRepository,
    private workspaceRepo: WorkspaceRepository,
  ) {}

  async execute({
    channelId,
    issuerId,
  }: DeleteChannel): Promise<{ channelId: number }> {
    const channel = await this.channelRepo.findOne({
      where: { id: channelId },
      relations: { peers: true },
    });
    if (!channel) throw new NotFoundException('Channel not found');

    const issuerMember = await this.workspaceRepo.findMember(
      channel.workspaceId,
      issuerId,
    );
    if (!issuerMember) throw new IssuerUserIsNotWorkspaceMember();

    const isPeer = channel.peers?.some((p) => p.id === issuerId) ?? false;
    if (!isPeer) throw new NotFoundException('Channel not found');

    await this.channelRepo.delete({ id: channelId });
    return { channelId };
  }
}
