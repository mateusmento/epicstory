import { BadRequestException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { IsArray, IsNumber, IsOptional } from 'class-validator';
import { UserRepository } from 'src/auth';
import { Channel } from 'src/channel/domain/entities/channel.entity';
import { ChannelRepository } from 'src/channel/infrastructure/repositories';
import { Issuer } from 'src/core/auth';
import { patch } from 'src/core/objects';
import { IssuerUserIsNotWorkspaceMember } from 'src/workspace/domain/exceptions';
import { TeamNotFound } from 'src/workspace/domain/exceptions';
import { TeamRepository } from 'src/workspace/infrastructure/repositories';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories';
import { enrichChannelsForListView } from 'src/channel/application/utils/channel-list-enrichment';
import { In } from 'typeorm';

export class CreateDirectOrMultiDirectChannel {
  workspaceId: number;
  issuer: Issuer;

  @IsOptional()
  @IsNumber()
  teamId?: number;

  /**
   * User IDs (excluding issuer). 1 = direct, 2+ = multi-direct.
   */
  @IsArray()
  @IsNumber({}, { each: true })
  peers: number[];

  constructor(partial: Partial<CreateDirectOrMultiDirectChannel>) {
    patch(this, partial);
  }
}

@CommandHandler(CreateDirectOrMultiDirectChannel)
export class CreateDirectOrMultiDirectChannelCommand
  implements ICommandHandler<CreateDirectOrMultiDirectChannel>
{
  constructor(
    private workspaceRepo: WorkspaceRepository,
    private channelRepo: ChannelRepository,
    private userRepo: UserRepository,
    private teamRepo: TeamRepository,
  ) {}

  async execute(command: CreateDirectOrMultiDirectChannel) {
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

    const uniquePeers = Array.from(
      new Set((command.peers ?? []).map((n) => Math.floor(Number(n)))),
    )
      .filter((id) => Number.isFinite(id) && id > 0)
      .filter((id) => id !== issuer.id);

    if (uniquePeers.length < 1) {
      throw new BadRequestException('At least 1 peer is required');
    }

    if (uniquePeers.length === 1) {
      // Direct channel (issuer + one peer), dedupe when possible.
      const peerId = uniquePeers[0];
      const existing = await this.channelRepo.findDirectChannel(
        peerId,
        issuer.id,
      );
      if (existing && existing.workspaceId === workspaceId) {
        const hydrated = await this.channelRepo.findChannel(existing.id, {
          peers: true,
        });
        if (hydrated) {
          enrichChannelsForListView([hydrated], issuer.id);
          return hydrated;
        }
      }

      const peers = await this.userRepo.findBy({ id: In([issuer.id, peerId]) });
      if (peers.length !== 2) {
        throw new BadRequestException('Peer user not found');
      }

      const channel = await this.channelRepo.save(
        Channel.createDirect({ workspaceId, teamId, peers }),
      );
      enrichChannelsForListView([channel], issuer.id);
      return channel;
    }

    // Multi-direct (issuer + 2+ peers). Dedup by same peer set + workspace.
    const peerSet = [issuer.id, ...uniquePeers];
    const existing = await this.channelRepo.findMultiDirectChannel(peerSet);
    if (existing && existing.workspaceId === workspaceId) {
      const hydrated = await this.channelRepo.findChannel(existing.id, {
        peers: true,
      });
      if (hydrated) {
        enrichChannelsForListView([hydrated], issuer.id);
        return hydrated;
      }
    }

    const users = await this.userRepo.findBy({ id: In(peerSet) });
    if (users.length !== peerSet.length) {
      throw new BadRequestException('One or more peer users not found');
    }

    const created = await this.channelRepo.save(
      Channel.createMultiDirect({ workspaceId, teamId, peers: users }),
    );

    enrichChannelsForListView([created], issuer.id);
    return created;
  }
}
