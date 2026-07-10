import { Workspace } from 'src/workspace/domain/entities';
import { WorkspaceDeleting } from 'src/workspace/domain/exceptions';

export function assertWorkspaceNotDeleting(workspace: Workspace): void {
  if (workspace.isDeleting) throw new WorkspaceDeleting();
}
