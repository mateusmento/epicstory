import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { patch } from 'src/core/objects';
import { IssuerUserIsNotWorkspaceMember } from 'src/workspace/domain/exceptions';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories/workspace.repository';
import { WorkspaceNotFound } from './add-workspace-owner.command';
import { WorkspaceGateway } from '../../gateways';

export class FindWorkspace {
  issuerId: number;
  workspaceId: number;

  constructor(data: Partial<FindWorkspace> = {}) {
    patch(this, data);
  }
}

@QueryHandler(FindWorkspace)
export class FindWorkspaceQuery implements IQueryHandler<FindWorkspace> {
  constructor(
    private workspaceRepo: WorkspaceRepository,
    private workspaceGateway: WorkspaceGateway,
  ) {}

  async execute({ issuerId, workspaceId }: FindWorkspace) {
    const issuer = await this.workspaceRepo.findMember(workspaceId, issuerId);
    if (!issuer) throw new IssuerUserIsNotWorkspaceMember();
    const workspace = await this.workspaceRepo.get(workspaceId);
    if (!workspace) throw new WorkspaceNotFound();
    const onlineUserIds =
      await this.workspaceGateway.getConnectedUserIds(workspaceId);
    workspace.onlineUsersSnapshot = onlineUserIds.filter(
      (id) => id !== issuerId,
    );
    return workspace;
  }
}
