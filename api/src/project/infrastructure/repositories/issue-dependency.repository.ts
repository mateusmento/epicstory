import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IssueDependency } from 'src/project/domain/entities';
import { Repository } from 'typeorm';

@Injectable()
export class IssueDependencyRepository extends Repository<IssueDependency> {
  constructor(
    @InjectRepository(IssueDependency)
    repo: Repository<IssueDependency>,
  ) {
    super(repo.target, repo.manager, repo.queryRunner);
  }
}
