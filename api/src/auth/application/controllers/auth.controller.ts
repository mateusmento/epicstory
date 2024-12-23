import {
  Body,
  Controller,
  Delete,
  Get,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { Request, Response } from 'express';
import { AppConfig } from 'src/core/app.config';
import { JwtAuthGuard } from 'src/core/auth/jwt.strategy';
import { FindUsers } from '../features/find-users.query';
import { Signin } from '../features/signin.command';
import { Signup } from '../features/signup.command';
import { LocalAuthGuard } from '../passport/local.strategy';

@Controller('auth')
export class AuthController {
  constructor(
    private queryBus: QueryBus,
    private commandBus: CommandBus,
    private config: AppConfig,
  ) {}

  @Get('users')
  findUsers(@Query() query: FindUsers) {
    return this.queryBus.execute(query);
  }

  @Post('users')
  signup(@Body() command: Signup) {
    return this.commandBus.execute(command);
  }

  @Get('tokens/current')
  @UseGuards(JwtAuthGuard)
  getToken(@Req() request: Request) {
    if (!request.user) throw new UnauthorizedException();
    return { user: request.user, token: request.cookies.token };
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
      sameSite: 'lax',
    });
    return user;
  }

  @UseGuards(JwtAuthGuard)
  @Delete('tokens')
  async signout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('token');
  }
}
