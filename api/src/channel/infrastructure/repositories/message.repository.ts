import { InjectRepository } from '@nestjs/typeorm';
import { Message } from 'src/channel/domain';
import { Repository } from 'typeorm';

export class MessageRepository extends Repository<Message> {
  constructor(
    @InjectRepository(Message)
    repo: Repository<Message>,
  ) {
    super(repo.target, repo.manager, repo.queryRunner);
  }
}
