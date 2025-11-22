export class IssuerCanNotAddWorkspaceOwner extends Error {
  constructor() {
    super('Issuer can not add workspace owner');
  }
}
