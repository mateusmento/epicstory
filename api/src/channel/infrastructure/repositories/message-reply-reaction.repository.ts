import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MessageReplyReaction } from 'src/channel/domain/entities/message-reply.entity';

export class MessageReplyReactionRepository extends Repository<MessageReplyReaction> {
  constructor(
    @InjectRepository(MessageReplyReaction)
    repo: Repository<MessageReplyReaction>,
  ) {
    super(repo.target, repo.manager, repo.queryRunner);
  }
}
