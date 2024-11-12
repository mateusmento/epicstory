import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Team } from 'src/workspace/domain/entities/team.entity';
import { Repository } from 'typeorm';

@Injectable()
export class TeamRepository extends Repository<Team> {
  constructor(
    @InjectRepository(Team)
    repo: Repository<Team>,
  ) {
    super(repo.target, repo.manager, repo.queryRunner);
  }
}
