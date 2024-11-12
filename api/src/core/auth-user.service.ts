import { Inject, Injectable, Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';

type RequestWithUser = Request & { user: any };

@Injectable({ scope: Scope.REQUEST })
export class AuthUserService {
  constructor(@Inject(REQUEST) private request: RequestWithUser) {}

  current() {
    return this.request.user;
  }
}
