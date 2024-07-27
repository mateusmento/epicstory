export class IssuerUserCanNotCreateProject extends Error {
  constructor() {
    super('Issuer user can not create project');
  }
}
