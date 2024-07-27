import { WorkspaceMember } from '../entities/workspace-member.entity';

export class AddWorkspaceMemberPrerequisite {
  constructor(
    public issuer: WorkspaceMember | null,
    public issuerIsWorkspaceMember: boolean,
    public memberExists: boolean,
  ) {}
}
