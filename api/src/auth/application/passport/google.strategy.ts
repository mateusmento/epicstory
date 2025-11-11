import { Injectable } from '@nestjs/common';
import { AuthGuard, PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy, StrategyOptions } from 'passport-google-oauth20';
import { AppConfig } from 'src/core/app.config';

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  constructor() {
    super({
      // will return refresh token in passport Strategy
      accessType: 'offline',
    });
  }

  canActivate(context: any) {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    // Store redirect parameter in a cookie to use after OAuth callback
    const redirect = request.query?.redirect as string | undefined;
    if (redirect) {
      response.cookie('oauth_redirect', redirect, {
        httpOnly: true,
        maxAge: 5 * 60 * 1000, // 5 minutes
        sameSite: 'lax',
      });
    }

    return super.canActivate(context);
  }
}

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private config: AppConfig) {
    super({
      clientID: config.GOOGLE_CLIENT_ID,
      clientSecret: config.GOOGLE_CLIENT_SECRET,
      callbackURL: config.GOOGLE_CALLBACK_URI,
      scope: ['email', 'profile'],
    } as StrategyOptions);
  }

  async validate(accessToken: string, refreshToken: string, profile: Profile) {
    return {
      accessToken,
      refreshToken,
      profile,
    };
  }
}
