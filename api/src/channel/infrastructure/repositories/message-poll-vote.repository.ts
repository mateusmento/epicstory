import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MessagePollVote } from 'src/channel/domain/entities/message-poll-vote.entity';

export class MessagePollVoteRepository extends Repository<MessagePollVote> {
  constructor(
    @InjectRepository(MessagePollVote)
    repo: Repository<MessagePollVote>,
  ) {
    super(repo.target, repo.manager, repo.queryRunner);
  }
}
