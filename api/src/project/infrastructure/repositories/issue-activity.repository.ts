import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IssueActivity } from 'src/project/domain/entities/issue-activity.entity';
import { Repository } from 'typeorm';

@Injectable()
export class IssueActivityRepository extends Repository<IssueActivity> {
  constructor(
    @InjectRepository(IssueActivity)
    repo: Repository<IssueActivity>,
  ) {
    super(repo.target, repo.manager, repo.queryRunner);
  }
}
