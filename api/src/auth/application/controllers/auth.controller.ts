import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { Request, Response } from 'express';
import { AppConfig } from 'src/core/app.config';
import { Signin } from '../features/signin.command';
import { Signup } from '../features/signup.command';
import { LocalAuthGuard } from '../passport/local.strategy';

@Controller('auth')
export class AuthController {
  constructor(
    private commandBus: CommandBus,
    private config: AppConfig,
  ) {}

  @Post('users')
  signup(@Body() command: Signup) {
    return this.commandBus.execute(command);
  }

  @Get('tokens/current')
  getToken(@Req() request: Request) {
    if (!request.user) throw new UnauthorizedException();
    return { user: request.user };
  }

  @Post('tokens')
  @UseGuards(LocalAuthGuard)
  async signin(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { token, user } = await this.commandBus.execute(
      new Signin({ user: request.user }),
    );
    response.cookie('token', `Bearer ${token}`, {
      httpOnly: true,
      maxAge: this.config.JWT_EXPIRES_IN * 1000,
    });
    return user;
  }
}
