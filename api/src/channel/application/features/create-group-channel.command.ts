import { BadRequestException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { IsNotEmpty, IsNumber, IsOptional } from 'class-validator';
import { UserRepository } from 'src/auth';
import { Channel } from 'src/channel/domain/entities/channel.entity';
import { ChannelRepository } from 'src/channel/infrastructure/repositories';
import { Issuer } from 'src/core/auth';
import { patch } from 'src/core/objects';
import { TeamNotFound } from 'src/workspace/domain/exceptions';
import { IssuerUserIsNotWorkspaceMember } from 'src/workspace/domain/exceptions';
import { TeamRepository } from 'src/workspace/infrastructure/repositories';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories';

export class CreateGroupChannel {
  workspaceId: number;
  issuer: Issuer;

  @IsOptional()
  @IsNumber()
  teamId?: number;

  @IsNotEmpty()
  name: string;

  constructor(partial: Partial<CreateGroupChannel>) {
    patch(this, partial);
  }
}

@CommandHandler(CreateGroupChannel)
export class CreateGroupChannelCommand
  implements ICommandHandler<CreateGroupChannel>
{
  constructor(
    private workspaceRepo: WorkspaceRepository,
    private channelRepo: ChannelRepository,
    private userRepo: UserRepository,
    private teamRepo: TeamRepository,
  ) {}

  async execute({ workspaceId, teamId, issuer, name }: CreateGroupChannel) {
    const member = await this.workspaceRepo.findMember(workspaceId, issuer.id);
    if (!member) throw new IssuerUserIsNotWorkspaceMember();
    if (teamId) {
      const team = await this.teamRepo.findOneBy({ id: teamId });
      if (!team) throw new TeamNotFound();
      if (team.workspaceId !== workspaceId) {
        throw new BadRequestException('Team does not belong to the workspace');
      }
    }
    const peer = await this.userRepo.findOneBy({ id: issuer.id });
    return this.channelRepo.save(
      Channel.create({ workspaceId, type: 'group', name, peers: [peer] }),
    );
  }
}
