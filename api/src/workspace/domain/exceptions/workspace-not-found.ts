import { NotFoundException } from '@nestjs/common';

export class WorkspaceNotFound extends NotFoundException {
  constructor() {
    super('Workspace not found');
  }
}
