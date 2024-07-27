import { Controller, Get, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { AppConfig } from 'src/core/app.config';
import { GoogleAuthGuard } from '../passport/google.strategy';

@Controller('auth')
export class GoogleAuthController {
  constructor(private config: AppConfig) {}

  @Get('/google')
  @UseGuards(GoogleAuthGuard)
  google() {}

  @Get('/google/callback')
  @UseGuards(GoogleAuthGuard)
  googleCallback(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    res.redirect(this.config.GOOGLE_APP_REDIRECT_URL);
  }
}
