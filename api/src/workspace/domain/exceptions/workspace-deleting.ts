import { ConflictException } from '@nestjs/common';

export class WorkspaceDeleting extends ConflictException {
  constructor(message = 'Workspace is being deleted') {
    super(message);
  }
}
