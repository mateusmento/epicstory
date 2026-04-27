import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WorkspaceMember } from 'src/workspace/domain/entities/workspace-member.entity';
import { Workspace } from 'src/workspace/domain/entities/workspace.entity';
import { IssuerUserIsNotWorkspaceMember } from 'src/workspace/domain/exceptions';
import { AddWorkspaceMemberPrerequisite } from 'src/workspace/domain/values/add-workspace-member-prerequisite.value';
import { FindOptionsRelations, In, Like, Repository } from 'typeorm';
import { Page } from 'src/core/page';

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

  async requiresMembership(workspaceId: number, userId: number) {
    const member = await this.findMember(workspaceId, userId);
    if (!member) throw new IssuerUserIsNotWorkspaceMember();
    return member;
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
    {
      workspaceId,
      name,
      userIds,
    }: { workspaceId: number; name?: string; userIds?: number[] },
    relations?: FindOptionsRelations<WorkspaceMember>,
  ) {
    return this.workspaceMemberRepo.find({
      where: {
        workspaceId,
        user: { name: name && Like(`%${name}%`) },
        userId: userIds && In(userIds),
      },
      relations,
    });
  }

  /**
   * Paginated search for workspace members by optional single-term `q` (name OR email)
   * or by `name` and `email` (AND) when `q` is absent — aligned with `FindUsers` patterns.
   */
  async findMembersPage({
    workspaceId,
    q,
    name,
    email,
    userIds,
    page = 0,
    count = 20,
  }: {
    workspaceId: number;
    q?: string;
    name?: string;
    email?: string;
    userIds?: number[];
    page?: number;
    count?: number;
  }): Promise<Page<WorkspaceMember>> {
    const qb = this.workspaceMemberRepo
      .createQueryBuilder('m')
      .leftJoinAndSelect('m.user', 'user')
      .where('m.workspaceId = :workspaceId', { workspaceId });

    if (userIds?.length) {
      qb.andWhere('m.userId IN (:...userIds)', { userIds });
    }

    const qTrim = q?.trim();
    if (qTrim) {
      const pattern = `%${qTrim}%`;
      qb.andWhere('(user.name ILIKE :q OR user.email ILIKE :q)', {
        q: pattern,
      });
    } else {
      if (name?.trim()) {
        qb.andWhere('user.name ILIKE :n', { n: `%${name.trim()}%` });
      }
      if (email?.trim()) {
        qb.andWhere('user.email ILIKE :e', { e: `%${email.trim()}%` });
      }
    }

    const total = await qb.getCount();
    const content = await qb
      .orderBy('user.name', 'ASC')
      .addOrderBy('m.id', 'ASC')
      .skip(page * count)
      .take(count)
      .getMany();

    return Page.fromResult(content, total, {
      page,
      count,
    }) as Page<WorkspaceMember>;
  }

  memberExists(workspaceId: number, userId: number) {
    return this.workspaceMemberRepo.exists({ where: { workspaceId, userId } });
  }
}
