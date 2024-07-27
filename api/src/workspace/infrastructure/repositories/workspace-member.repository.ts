import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WorkspaceMember } from 'src/workspace/domain/entities/workspace-member.entity';
import { Repository } from 'typeorm';

@Injectable()
export class WorkspaceMemberRepository extends Repository<WorkspaceMember> {
  constructor(
    @InjectRepository(WorkspaceMember)
    repo: Repository<WorkspaceMember>,
  ) {
    super(repo.target, repo.manager, repo.queryRunner);
  }
}
