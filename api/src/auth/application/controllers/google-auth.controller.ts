import { Controller, Get, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { AppConfig } from 'src/core/app.config';
import { GoogleAuthGuard } from '../passport/google.strategy';
import { CommandBus } from '@nestjs/cqrs';
import { GoogleSignup, Signin } from '../features';
import { UserRepository } from 'src/auth/infrastructure';

@Controller('auth')
export class GoogleAuthController {
  constructor(
    private config: AppConfig,
    private commandBus: CommandBus,
    private userRepo: UserRepository,
  ) {}

  @Get('/google')
  @UseGuards(GoogleAuthGuard)
  google() {}

  @Get('/google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleCallback(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const guser = req.user as any;
    const name = guser.profile.displayName;
    const { picture, email } = guser.profile._json;

    const user =
      (await this.userRepo.findOneBy({ email })) ??
      (await this.commandBus.execute(
        new GoogleSignup({ name, email, picture }),
      ));

    const { token } = await this.commandBus.execute(new Signin({ user }));
    res.cookie('token', `Bearer ${token}`, {
      httpOnly: true,
      maxAge: this.config.JWT_EXPIRES_IN * 1000,
      sameSite: 'lax',
    });

    res.redirect(this.config.GOOGLE_APP_REDIRECT_URL);
  }
}
