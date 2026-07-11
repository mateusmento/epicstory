import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IssueDescriptionThreadMessage } from 'src/project/domain/entities';
import { Repository } from 'typeorm';

@Injectable()
export class IssueDescriptionThreadMessageRepository extends Repository<IssueDescriptionThreadMessage> {
  constructor(
    @InjectRepository(IssueDescriptionThreadMessage)
    repo: Repository<IssueDescriptionThreadMessage>,
  ) {
    super(repo.target, repo.manager, repo.queryRunner);
  }
}
