import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { IsNotEmpty, IsNumber, IsOptional } from 'class-validator';
import { UserRepository } from 'src/auth';
import { Channel } from 'src/channel/domain/entities/channel.entity';
import { ChannelRepository } from 'src/channel/infrastructure';
import { Issuer } from 'src/core/auth';
import { patch } from 'src/core/objects';
import { TeamNotFound } from 'src/workspace/domain/exceptions';
import { IssuerUserIsNotWorkspaceMember } from 'src/workspace/domain/exceptions';
import { TeamRepository } from 'src/workspace/infrastructure/repositories';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories';

export class CreateDirectChannel {
  workspaceId: number;
  issuer: Issuer;

  @IsOptional()
  @IsNumber()
  teamId?: number;

  @IsNotEmpty()
  username: string;

  constructor(partial: Partial<CreateDirectChannel>) {
    patch(this, partial);
  }
}

@CommandHandler(CreateDirectChannel)
export class CreateDirectChannelCommand
  implements ICommandHandler<CreateDirectChannel>
{
  constructor(
    private workspaceRepo: WorkspaceRepository,
    private channelRepo: ChannelRepository,
    private userRepo: UserRepository,
    private teamRepo: TeamRepository,
  ) {}

  async execute(command: CreateDirectChannel) {
    const { workspaceId, teamId, issuer } = command;
    const member = await this.workspaceRepo.findMember(workspaceId, issuer.id);
    if (!member) throw new IssuerUserIsNotWorkspaceMember();
    if (teamId) {
      const team = await this.teamRepo.findOneBy({ id: teamId });
      if (!team) throw new TeamNotFound();
      if (team.workspaceId !== workspaceId) {
        throw new BadRequestException('Team does not belong to the workspace');
      }
    }
    return this.createDirectChannel(command);
  }

  async createDirectChannel({
    issuer,
    username,
    ...data
  }: CreateDirectChannel) {
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
