import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { IsNumber } from 'class-validator';
import { UserRepository } from 'src/auth';
import { ChannelRepository } from 'src/channel/infrastructure';
import { patch } from 'src/core/objects';
import { IssuerUserIsNotWorkspaceMember } from 'src/workspace/domain/exceptions';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories';

export class AddChannelMember {
  channelId: number;
  issuerId: number;
  @IsNumber()
  userId: number;

  constructor(data: Partial<AddChannelMember> = {}) {
    patch(this, data);
  }
}

@CommandHandler(AddChannelMember)
export class AddChannelMemberCommand
  implements ICommandHandler<AddChannelMember>
{
  constructor(
    private channelRepo: ChannelRepository,
    private userRepo: UserRepository,
    private workspaceRepo: WorkspaceRepository,
  ) {}

  async execute({ channelId, userId, issuerId }: AddChannelMember) {
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

    const user = await this.userRepo.findOneBy({ id: userId });

    if (!user) throw new NotFoundException('User not found');

    const userMember = await this.workspaceRepo.findMember(
      channel.workspaceId,
      userId,
    );

    if (!userMember)
      throw new BadRequestException('User is not a workspace member');

    channel.peers.push(user);

    return this.channelRepo.save(channel);
  }
}
