import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ChannelNotFound } from 'src/channel/application/exceptions';
import {
  Channel,
  ChannelType,
} from 'src/channel/domain/entities/channel.entity';
import { FindOptionsRelations, Repository } from 'typeorm';

@Injectable()
export class ChannelRepository extends Repository<Channel> {
  constructor(
    @InjectRepository(Channel)
    repo: Repository<Channel>,
  ) {
    super(repo.target, repo.manager, repo.queryRunner);
  }

  async requiresChannel(
    { channelId, workspaceId }: { channelId: number; workspaceId: number },
    relations?: FindOptionsRelations<Channel>,
  ) {
    const channel = await this.findOne({
      where: { id: channelId, workspaceId },
      relations,
    });
    if (!channel) throw new ChannelNotFound();
    return channel;
  }

  findChannel(id: number, relations?: FindOptionsRelations<Channel>) {
    return this.findOne({ where: { id }, relations });
  }

  async findChannelsUserIsMember(userId: number, workspaceId: number) {
    return this.createQueryBuilder('channel')
      .innerJoin('channel.peers', 'peer')
      .where('peer.id = :userId', { userId })
      .andWhere('channel.workspaceId = :workspaceId', { workspaceId })
      .getMany();
  }

  async findChannelUserIsMember(
    channelId: number,
    userId: number,
    workspaceId?: number,
  ): Promise<Channel> {
    const qb = this.createQueryBuilder('c')
      .innerJoin('c.peers', 'peer', 'peer.id = :userId', { userId })
      .where('c.id = :channelId', { channelId });
    if (workspaceId)
      qb.andWhere('c.workspaceId = :workspaceId', { workspaceId });
    return await qb.getOne();
  }

  findByPeers(workspaceId: number, peers: number[], type?: ChannelType) {
    const peerIds = [...new Set(peers)];
    if (peerIds.length === 0) {
      return Promise.resolve(null);
    }

    const matchingIds = this.createQueryBuilder('c2')
      .subQuery()
      .select('c2.id')
      .from(Channel, 'c2')
      .innerJoin('channel_peers', 'cp', 'cp.channel_id = c2.id')
      .where(type ? 'c2.type = :type' : 'TRUE', { type })
      .andWhere('c2.workspaceId = :workspaceId', { workspaceId })
      .groupBy('c2.id')
      .having('COUNT(DISTINCT cp.users_id) = :peerCount', {
        peerCount: peerIds.length,
      })
      .andHaving('BOOL_AND(cp.users_id IN (:...peerIds))', { peerIds });

    return this.createQueryBuilder('c')
      .leftJoinAndSelect('c.peers', 'peer')
      .where(`c.id IN ${matchingIds.getQuery()}`)
      .setParameters(matchingIds.getParameters())
      .getOne();
  }

  /**
   * @deprecated: Use {@link findByPeers} instead.
   * Find a direct channel between two users in a workspace.
   * @param workspaceId - The ID of the workspace.
   * @param receiverId - The ID of the user who is the receiver.
   * @param senderId - The ID of the user who is the sender.
   * @returns The direct channel between the two users.
   */
  findDirectChannel(workspaceId: number, receiverId: number, senderId: number) {
    return this.createQueryBuilder('c')
      .innerJoin(
        'channel_peers',
        'p1',
        'p1.channel_id = c.id AND p1.users_id = :receiverId',
        { receiverId },
      )
      .innerJoin(
        'channel_peers',
        'p2',
        'p2.channel_id = c.id AND p2.users_id = :senderId',
        { senderId },
      )
      .leftJoinAndSelect('c.peers', 'p')
      .where('c.type = :type', { type: 'direct' })
      .andWhere('c.workspaceId = :workspaceId', { workspaceId })
      .getOne();
  }
}
