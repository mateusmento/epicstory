export class CannotAssignWorkspaceOwner extends Error {
  constructor(
    message = 'Workspace ownership can only be changed via transfer ownership',
  ) {
    super(message);
  }
}
