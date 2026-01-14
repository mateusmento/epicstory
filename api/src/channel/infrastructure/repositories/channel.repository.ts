import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Channel } from 'src/channel/domain/entities/channel.entity';
import { Repository } from 'typeorm';

@Injectable()
export class ChannelRepository extends Repository<Channel> {
  constructor(
    @InjectRepository(Channel)
    repo: Repository<Channel>,
  ) {
    super(repo.target, repo.manager, repo.queryRunner);
  }

  findChannel(id: number) {
    return this.findOne({ where: { id } });
  }

  findMultiDirectChannel(peers: number[]) {
    return this.createQueryBuilder('c')
      .innerJoin('channel_peers', 'p', 'p.channel_id = c.id')
      .where('p.users_id IN (:...peers)', { peers })
      .andWhere('c.type = :type', { type: 'multi-direct' })
      .groupBy('c.id')
      .having('COUNT(DISTINCT p.users_id) = :n', { n: peers.length })
      .getOne();
  }

  findDirectChannel(receiverId: number, senderId: number) {
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
      .where('c.type = :type', { type: 'direct' })
      .getOne();
  }
}
