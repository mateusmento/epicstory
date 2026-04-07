import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';
import { Channel } from 'src/channel/domain/entities/channel.entity';
import { ChannelRepository } from 'src/channel/infrastructure/repositories';
import { patch } from 'src/core/objects';
import { IssuerUserIsNotWorkspaceMember } from 'src/workspace/domain/exceptions';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories';

export class RenameChannel {
  @IsNumber()
  channelId: number;

  @IsNumber()
  issuerId: number;

  @IsString()
  @IsNotEmpty()
  name: string;

  constructor(data: Partial<RenameChannel> = {}) {
    patch(this, data);
  }
}

@CommandHandler(RenameChannel)
export class RenameChannelCommand implements ICommandHandler<RenameChannel> {
  constructor(
    private channelRepo: ChannelRepository,
    private workspaceRepo: WorkspaceRepository,
  ) {}

  async execute({
    channelId,
    issuerId,
    name,
  }: RenameChannel): Promise<Channel> {
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

    if (channel.type === 'direct') {
      throw new BadRequestException('Direct channels can not be renamed');
    }

    channel.name = name.trim();
    return await this.channelRepo.save(channel);
  }
}
