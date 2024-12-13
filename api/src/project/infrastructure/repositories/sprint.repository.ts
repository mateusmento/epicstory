import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Sprint } from 'src/project/domain/entities';
import { Repository } from 'typeorm';

@Injectable()
export class SprintRepository extends Repository<Sprint> {
  constructor(
    @InjectRepository(Sprint)
    repo: Repository<Sprint>,
  ) {
    super(repo.target, repo.manager, repo.queryRunner);
  }
}
