import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MessageReply } from 'src/channel/domain/entities';

export class MessageReplyRepository extends Repository<MessageReply> {
  constructor(
    @InjectRepository(MessageReply)
    repo: Repository<MessageReply>,
  ) {
    super(repo.target, repo.manager, repo.queryRunner);
  }

  async findRepliers(
    messageIds: number[],
  ): Promise<{ messageId: number; senderId: number; repliesCount: number }[]> {
    let repliers = await this.createQueryBuilder('r')
      .where('r.messageId IN (:...messageIds)', { messageIds })
      .groupBy('r.messageId')
      .addGroupBy('r.senderId')
      .select('r.senderId', 'senderId')
      .addSelect('r.messageId', 'messageId')
      .addSelect('COUNT(r.id)', 'repliesCount')
      .getRawMany();

    return repliers.map((r) => ({ ...r, repliesCount: +r.repliesCount }));
  }
}
