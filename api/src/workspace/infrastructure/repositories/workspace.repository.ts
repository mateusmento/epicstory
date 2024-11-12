import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WorkspaceMember } from 'src/workspace/domain/entities/workspace-member.entity';
import { Workspace } from 'src/workspace/domain/entities/workspace.entity';
import { AddWorkspaceMemberPrerequisite } from 'src/workspace/domain/values/add-workspace-member-prerequisite.value';
import { FindOptionsRelations, Repository } from 'typeorm';

@Injectable()
export class WorkspaceRepository extends Repository<Workspace> {
  constructor(
    @InjectRepository(WorkspaceMember)
    private workspaceMemberRepo: Repository<WorkspaceMember>,
    @InjectRepository(Workspace)
    repo: Repository<Workspace>,
  ) {
    super(repo.target, repo.manager, repo.queryRunner);
  }

  get(id: number, relations?: FindOptionsRelations<Workspace>) {
    return this.findOne({ where: { id }, relations });
  }

  async findAddWorkspaceMemberPrerequisite(
    issuerId: number,
    workspaceId: number,
    userId: number,
  ) {
    const issuer = await this.findMember(workspaceId, issuerId);
    const memberExists = await this.memberExists(workspaceId, userId);
    return new AddWorkspaceMemberPrerequisite(issuer, !!issuer, memberExists);
  }

  findMember(
    workspaceId: number,
    userId: number,
    relations?: FindOptionsRelations<WorkspaceMember>,
  ) {
    return this.workspaceMemberRepo.findOne({
      where: { workspaceId, userId },
      relations,
    });
  }

  findMembers(
    workspaceId: number,
    relations?: FindOptionsRelations<WorkspaceMember>,
  ) {
    return this.workspaceMemberRepo.find({
      where: { workspaceId },
      relations,
    });
  }

  memberExists(workspaceId: number, userId: number) {
    return this.workspaceMemberRepo.exists({ where: { workspaceId, userId } });
  }
}
