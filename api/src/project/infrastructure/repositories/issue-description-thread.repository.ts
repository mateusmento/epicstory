import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IssueDescriptionThread } from 'src/project/domain/entities';
import { Repository } from 'typeorm';

@Injectable()
export class IssueDescriptionThreadRepository extends Repository<IssueDescriptionThread> {
  constructor(
    @InjectRepository(IssueDescriptionThread)
    repo: Repository<IssueDescriptionThread>,
  ) {
    super(repo.target, repo.manager, repo.queryRunner);
  }
}
