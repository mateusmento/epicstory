import { Injectable } from '@nestjs/common';
import { AuthGuard, PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { ExtractJwt, Strategy, StrategyOptions } from 'passport-jwt';
import { UserRepository } from 'src/auth';
import { AppConfig } from 'src/core/app.config';

type RequestWithCookie = Request & {
  cookies?: Record<string, string>;
};

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: AppConfig,
    private userRepo: UserRepository,
  ) {
    super({
      secretOrKey: config.JWT_SECRET,
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (req: RequestWithCookie) => {
          return req.cookies?.token?.replace('Bearer ', '') ?? null;
        },
      ]),
    } as StrategyOptions);
  }

  validate(user: any) {
    return this.userRepo.findOneBy({ id: user.id });
  }
}
