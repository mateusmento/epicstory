export class IssuerCanNotCreateTeam extends Error {
  constructor() {
    super('Issuer can not create team');
  }
}
