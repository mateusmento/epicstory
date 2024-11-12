export class WorkspaceMemberAlreadyExists extends Error {
  constructor() {
    super('Workspace member already exists');
  }
}
