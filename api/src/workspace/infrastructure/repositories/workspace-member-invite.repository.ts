import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WorkspaceMemberInvite } from 'src/workspace/domain/entities';
import { Repository } from 'typeorm';

@Injectable()
export class WorkspaceMemberInviteRepository extends Repository<WorkspaceMemberInvite> {
  constructor(
    @InjectRepository(WorkspaceMemberInvite)
    repo: Repository<WorkspaceMemberInvite>,
  ) {
    super(repo.target, repo.manager, repo.queryRunner);
  }
}
