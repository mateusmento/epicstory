import { BadRequestException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { patch } from 'src/core/objects';
import { WorkspaceRole } from 'src/workspace/domain/values/workspace-role.value';

/**
 * @deprecated Single-owner model — use {@link TransferWorkspaceOwnership}.
 */
export class RemoveWorkspaceOwner {
  issuerId: number;
  workspaceId: number;
  ownerId: number;
  newRole?: WorkspaceRole;
  removeFromWorkspace: boolean;

  constructor(data: Partial<RemoveWorkspaceOwner>) {
    patch(this, data);
  }
}

@CommandHandler(RemoveWorkspaceOwner)
export class RemoveWorkspaceOwnerCommand
  implements ICommandHandler<RemoveWorkspaceOwner>
{
  async execute(): Promise<never> {
    throw new BadRequestException(
      'Workspace ownership can only be changed via transfer ownership',
    );
  }
}
