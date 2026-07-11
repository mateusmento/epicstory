import type { IDescriptionThread } from '@epicstory/contracts';
import { NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { UserRepository, userToIUser } from 'src/auth';
import { Issuer } from 'src/core/auth';
import { patch } from 'src/core/objects';
import {
  IssueDescriptionThreadRepository,
  IssueRepository,
} from 'src/project/infrastructure/repositories';
import { IssuerUserIsNotWorkspaceMember } from 'src/workspace/domain/exceptions';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories';
import { In } from 'typeorm';
import { mapDescriptionThread } from './description-thread.mapper';

export class FindDescriptionThreads {
  issuer: Issuer;
  issueId: number;

  constructor(data: Partial<FindDescriptionThreads> = {}) {
    patch(this, data);
  }
}

@QueryHandler(FindDescriptionThreads)
export class FindDescriptionThreadsQuery
  implements IQueryHandler<FindDescriptionThreads>
{
  constructor(
    private issueRepo: IssueRepository,
    private workspaceRepo: WorkspaceRepository,
    private threadRepo: IssueDescriptionThreadRepository,
    private userRepo: UserRepository,
  ) {}

  async execute({
    issuer,
    issueId,
  }: FindDescriptionThreads): Promise<IDescriptionThread[]> {
    const issue = await this.issueRepo.findOne({ where: { id: issueId } });
    if (!issue) throw new NotFoundException('Issue not found');

    if (
      !(await this.workspaceRepo.memberExists(issue.workspaceId, issuer.id))
    ) {
      throw new IssuerUserIsNotWorkspaceMember();
    }

    const threads = await this.threadRepo.find({
      where: { issueId },
      relations: { messages: true },
    });

    const authorIds = new Set<number>();
    for (const t of threads) {
      authorIds.add(t.createdById);
      for (const m of t.messages ?? []) authorIds.add(m.authorId);
    }

    const users =
      authorIds.size > 0
        ? await this.userRepo.find({ where: { id: In([...authorIds]) } })
        : [];
    const byId = new Map(users.map((u) => [u.id, userToIUser(u)]));

    return threads
      .map((t) => mapDescriptionThread(t, byId))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }
}
