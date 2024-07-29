import { NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { IsNotEmpty } from 'class-validator';
import { UserRepository } from 'src/auth';
import { Channel } from 'src/channel/domain/entities/channel.entity';
import { ChannelRepository } from 'src/channel/infrastructure/repositories/channel.repository';
import { Issuer } from 'src/core/auth';
import { patch } from 'src/core/objects';
import { IssuerUserIsNotWorkspaceMember } from 'src/workspace/domain/exceptions/issuer-user-is-not-workspace-member';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories/workspace.repository';

export class CreateChannel {
  workspaceId: number;
  issuer: Issuer;

  @IsNotEmpty()
  name: string;

  @IsNotEmpty()
  username: string;

  constructor(partial: Partial<CreateChannel>) {
    patch(this, partial);
  }
}

@CommandHandler(CreateChannel)
export class CreateDirectChannelCommand
  implements ICommandHandler<CreateChannel>
{
  constructor(
    private workspaceRepo: WorkspaceRepository,
    private channelRepo: ChannelRepository,
    private userRepo: UserRepository,
  ) {}

  async execute(command: CreateChannel) {
    const { workspaceId, issuer } = command;
    const member = await this.workspaceRepo.findMember(workspaceId, issuer.id);
    if (!member) throw new IssuerUserIsNotWorkspaceMember();
    return this.createDirectChannel(command);
  }

  async createDirectChannel({ issuer, username, ...data }: CreateChannel) {
    const [me, peer] = [issuer.id, username];

    const peers = await this.userRepo
      .createQueryBuilder('user')
      // .leftJoin('user.credential', 'cred')
      // .where('cred.username = :peerUserName', { peerUserName })
      .where('user.email = :peer', { peer })
      .orWhere('user.id = :me', { me })
      .getMany();

    if (peers.length < 2) throw new NotFoundException('User not found');

    const channel = await this.channelRepo.save(
      Channel.create({
        type: 'direct',
        peers,
        ...data,
      }),
    );

    channel.speakingTo = channel.peers.find((p) => p.id !== me);
    return channel;
  }
}
