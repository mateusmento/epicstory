import { BadRequestException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { patch } from 'src/core/objects';

/**
 * @deprecated Single-owner model — use {@link TransferWorkspaceOwnership}.
 */
export class AddWorkspaceOwner {
  issuerId: number;
  workspaceId: number;
  newOwnerId: number;

  constructor(data: Partial<AddWorkspaceOwner>) {
    patch(this, data);
  }
}

@CommandHandler(AddWorkspaceOwner)
export class AddWorkspaceOwnerCommand
  implements ICommandHandler<AddWorkspaceOwner>
{
  async execute(): Promise<never> {
    throw new BadRequestException(
      'Workspace ownership can only be changed via transfer ownership',
    );
  }
}
