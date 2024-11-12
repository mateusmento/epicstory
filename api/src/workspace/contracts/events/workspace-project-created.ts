import { patch } from 'src/core/objects';

export class WorkspaceProjectCreated {
  project: {
    id: number;
    name: string;
    workspaceId: number;
  };

  constructor(data: Partial<WorkspaceProjectCreated>) {
    patch(this, data);
  }
}
