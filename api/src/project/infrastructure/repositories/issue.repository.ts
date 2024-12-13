import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Issue } from 'src/project/domain/entities';
import { Repository } from 'typeorm';

@Injectable()
export class IssueRepository extends Repository<Issue> {
  constructor(
    @InjectRepository(Issue)
    repo: Repository<Issue>,
  ) {
    super(repo.target, repo.manager, repo.queryRunner);
  }
}
