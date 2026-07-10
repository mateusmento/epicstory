import { NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Issuer } from 'src/core/auth';
import { patch } from 'src/core/objects';
import { IssueRepository } from 'src/project/infrastructure/repositories';
import { IssuerUserIsNotWorkspaceMember } from 'src/workspace/domain/exceptions';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories';

export class CountIssueDescendants {
  issueId: number;
  issuer: Issuer;

  constructor(data: Partial<CountIssueDescendants> = {}) {
    patch(this, data);
  }
}

@QueryHandler(CountIssueDescendants)
export class CountIssueDescendantsQuery
  implements IQueryHandler<CountIssueDescendants>
{
  constructor(
    private issueRepo: IssueRepository,
    private workspaceRepo: WorkspaceRepository,
  ) {}

  async execute({ issueId, issuer }: CountIssueDescendants) {
    const root = await this.issueRepo.findOne({ where: { id: issueId } });
    if (!root) throw new NotFoundException('Issue not found');
    if (!(await this.workspaceRepo.memberExists(root.workspaceId, issuer.id)))
      throw new IssuerUserIsNotWorkspaceMember();

    const queue = [root.id];
    const seen = new Set<number>([root.id]);
    let count = 0;

    while (queue.length > 0) {
      const parentId = queue.shift()!;
      const children = await this.issueRepo.find({
        where: { parentIssueId: parentId },
        select: { id: true },
      });
      for (const child of children) {
        if (seen.has(child.id)) continue;
        seen.add(child.id);
        count += 1;
        queue.push(child.id);
      }
    }

    return { count };
  }
}
