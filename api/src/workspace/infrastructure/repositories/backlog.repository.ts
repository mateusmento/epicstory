import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Backlog } from 'src/workspace/domain/entities/backlog.entity';
import { Repository } from 'typeorm';

@Injectable()
export class BacklogRepository extends Repository<Backlog> {
  constructor(@InjectRepository(Backlog) repo: Repository<Backlog>) {
    super(repo.target, repo.manager, repo.queryRunner);
  }
}
