import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { uniq } from 'lodash';
import { User } from 'src/auth';
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

  async requiresMembership(
    workspaceId: number,
    userId: number,
    relations?: FindOptionsRelations<WorkspaceMember>,
  ) {
    const member = await this.findMember(workspaceId, userId, relations);
    if (!member) throw new IssuerUserIsNotWorkspaceMember();
    return member;
  }

  async isMember(workspaceId: number, userId: number) {
    return await this.workspaceMemberRepo.existsBy({ workspaceId, userId });
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
    });
  }

  memberExists(workspaceId: number, userId: number) {
    return this.workspaceMemberRepo.exists({ where: { workspaceId, userId } });
  }

  /**
   * Members in this workspace for the given user ids, keyed by userId (`userIds` deduped).
   */
  async findMembersMap(
    workspaceId: number,
    userIds: number[],
  ): Promise<Map<number, User>> {
    const ids = uniq(userIds.filter((id) => id != null));
    if (ids.length === 0) return new Map();
    const members = await this.findMembers(
      { workspaceId, userIds: ids },
      { user: true },
    );
    return new Map(members.map((m) => [m.userId, m.user]));
  }
}
