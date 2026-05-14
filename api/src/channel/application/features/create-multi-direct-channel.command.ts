import { BadRequestException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { IsArray, IsNumber, IsOptional } from 'class-validator';
import { uniq } from 'lodash';
import { UserRepository } from 'src/auth';
import { enrichChannelForPreview } from 'src/channel/application/utils/enrich-channel';
import { Channel } from 'src/channel/domain/entities/channel.entity';
import { ChannelRepository } from 'src/channel/infrastructure/repositories';
import { Issuer } from 'src/core/auth';
import { patch } from 'src/core/objects';
import { TeamNotFound } from 'src/workspace/domain/exceptions';
import {
  TeamRepository,
  WorkspaceRepository,
} from 'src/workspace/infrastructure/repositories';
import { In } from 'typeorm';

export class CreateMultiDirectChannel {
  workspaceId: number;
  issuer: Issuer;

  @IsOptional()
  @IsNumber()
  teamId?: number;

  @IsArray()
  @IsNumber({}, { each: true })
  peers: number[];

  constructor(partial: Partial<CreateMultiDirectChannel>) {
    patch(this, partial);
  }
}

@CommandHandler(CreateMultiDirectChannel)
export class CreateMultiDirectChannelCommand
  implements ICommandHandler<CreateMultiDirectChannel>
{
  constructor(
    private workspaceRepo: WorkspaceRepository,
    private channelRepo: ChannelRepository,
    private userRepo: UserRepository,
    private teamRepo: TeamRepository,
  ) {}

  async execute(command: CreateMultiDirectChannel) {
    const { workspaceId: wId, teamId, issuer } = command;
    await this.workspaceRepo.requiresMembership(wId, issuer.id);

    if (teamId) {
      const team = await this.teamRepo.findOneBy({ id: teamId });
      if (!team) throw new TeamNotFound();
      if (team.workspaceId !== wId) {
        throw new BadRequestException('Team does not belong to the workspace');
      }
    }

    const uniquePeers = uniq((command.peers ?? []).map((n) => Math.floor(+n)))
      .filter((id) => Number.isFinite(id) && id > 0)
      .filter((id) => id !== issuer.id);

    if (uniquePeers.length < 1) {
      throw new BadRequestException('At least 1 peer is required');
    }

    const peers = [issuer.id, ...uniquePeers];

    const resolveDirectChannel = async () =>
      (await this.channelRepo.findByPeers(wId, peers, 'direct')) ??
      (await this.createDirectChannel(wId, teamId, peers));

    const resolveMultiDirectChannel = async () =>
      (await this.channelRepo.findByPeers(wId, peers, 'multi-direct')) ??
      (await this.createMultiDirectChannel(wId, teamId, peers));

    const channel =
      uniquePeers.length === 1
        ? await resolveDirectChannel()
        : await resolveMultiDirectChannel();

    return enrichChannelForPreview(channel, issuer.id);
  }

  async requiresPeers(peerIds: number[]) {
    const peers = await this.userRepo.findBy({ id: In(peerIds) });
    if (peers.length !== peerIds.length) {
      throw new BadRequestException('Peers not found');
    }
    return peers;
  }

  async createDirectChannel(
    workspaceId: number,
    teamId: number,
    peerIds: number[],
  ) {
    const peers = await this.requiresPeers(peerIds);
    const channel = await this.channelRepo.save(
      Channel.createDirect({ workspaceId, teamId, peers }),
    );
    return channel;
  }

  async createMultiDirectChannel(
    workspaceId: number,
    teamId: number,
    peerIds: number[],
  ) {
    const peers = await this.requiresPeers(peerIds);
    const channel = await this.channelRepo.save(
      Channel.createMultiDirect({ workspaceId, teamId, peers: peers }),
    );
    return channel;
  }
}
