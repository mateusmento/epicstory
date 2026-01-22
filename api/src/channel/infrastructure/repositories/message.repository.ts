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
}
