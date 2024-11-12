import { Injectable } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { AuthGuard, PassportStrategy } from '@nestjs/passport';
import { IStrategyOptions, Strategy } from 'passport-local';
import { Authenticate } from '../features/authenticate.command';

@Injectable()
export class LocalAuthGuard extends AuthGuard('local') {}

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private commandBus: CommandBus) {
    super({
      usernameField: 'email',
    } as IStrategyOptions);
  }

  async validate(email: string, password: string) {
    return this.commandBus.execute(new Authenticate({ email, password }));
  }
}
