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
}
