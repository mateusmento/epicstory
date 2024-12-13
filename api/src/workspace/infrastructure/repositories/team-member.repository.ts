import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TeamMember } from 'src/workspace/domain/entities/team-member.entity';
import { Repository } from 'typeorm';

@Injectable()
export class TeamMemberRepository extends Repository<TeamMember> {
  constructor(
    @InjectRepository(TeamMember)
    repo: Repository<TeamMember>,
  ) {
    super(repo.target, repo.manager, repo.queryRunner);
  }
}
