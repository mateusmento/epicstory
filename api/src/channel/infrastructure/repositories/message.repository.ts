import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Message } from 'src/channel/domain';
import { Repository } from 'typeorm';

@Injectable()
export class MessageRepository extends Repository<Message> {
  constructor(
    @InjectRepository(Message)
    repo: Repository<Message>,
  ) {
    super(repo.target, repo.manager, repo.queryRunner);
  }

  async findRepliesCount(
    messageIds: number[],
  ): Promise<{ messageId: number; repliesCount: number }[]> {
    if (messageIds.length === 0) return [];

    const repliesCount = await this.createQueryBuilder('m')
      .leftJoin('m.allReplies', 'r')
      .where('r.messageId IN (:...messageIds)', { messageIds })
      .groupBy('m.id')
      .orderBy('m.sentAt', 'ASC')
      .select('m.id', 'messageId')
      .addSelect('COUNT(r.id)', 'repliesCount')
      .getRawMany();

    return repliesCount.map((r) => ({ ...r, repliesCount: +r.repliesCount }));
  }
}
