import { ForbiddenException } from '@nestjs/common';

export class IssuerUserCanNotAddWorkspaceMember extends ForbiddenException {
  constructor() {
    super('Issuer user can not add workspace member');
  }
}
