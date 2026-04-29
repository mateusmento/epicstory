import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { MessageReply } from 'src/channel/domain/entities';

export class MessageReplyRepository extends Repository<MessageReply> {
  constructor(
    @InjectRepository(MessageReply)
    repo: Repository<MessageReply>,
  ) {
    super(repo.target, repo.manager, repo.queryRunner);
  }

  /**
   * Last K replies per thread (batch), ordered ascending within each thread for display.
   */
  async findLatestRepliesForParents(
    messageIds: number[],
    limitPerParent: number,
  ): Promise<MessageReply[]> {
    if (messageIds.length === 0) return [];

    const idRows: { id: number }[] = await this.manager.query(
      `
      WITH ranked AS (
        SELECT id, message_id,
          ROW_NUMBER() OVER (
            PARTITION BY message_id ORDER BY sent_at DESC
          ) AS rn
        FROM channel.message_replies
        WHERE message_id = ANY ($1::int[])
      )
      SELECT id FROM ranked WHERE rn <= $2 ORDER BY message_id ASC, id ASC
    `,
      [messageIds, limitPerParent],
    );
    const orderedIds = idRows.map((r) => r.id);
    if (orderedIds.length === 0) return [];

    const loaded = await this.find({
      where: { id: In(orderedIds) },
      relations: { sender: true, allReactions: { user: true } },
    });
    const byId = new Map(loaded.map((r) => [r.id, r]));
    return orderedIds
      .map((id) => byId.get(id))
      .filter(Boolean) as MessageReply[];
  }

  async findRepliers(
    messageIds: number[],
  ): Promise<{ messageId: number; senderId: number; repliesCount: number }[]> {
    const repliers = await this.createQueryBuilder('r')
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
