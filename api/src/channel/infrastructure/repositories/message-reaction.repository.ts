import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MessageReaction } from 'src/channel/domain/entities/message.entity';

export class MessageReactionRepository extends Repository<MessageReaction> {
  constructor(
    @InjectRepository(MessageReaction)
    repo: Repository<MessageReaction>,
  ) {
    super(repo.target, repo.manager, repo.queryRunner);
  }
}
