import { ExecutionContext, createParamDecorator } from '@nestjs/common';

export interface Issuer {
  id: number;
  name: string;
  email: string;
}

export const Auth = createParamDecorator(
  (data: unknown, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest();
    return request.user;
  },
);
