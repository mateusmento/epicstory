export class IssuerUserIsNotWorkspaceMember extends Error {
  constructor() {
    super('Issuer user is not a workspace member');
  }
}
