import { Body, Controller, Put, UseGuards } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { Auth, Issuer, JwtAuthGuard } from 'src/core/auth';
import { UpdateUserPicture } from '../features/update-user-picture.command';

@Controller('/users')
export class UserController {
  constructor(private commandBus: CommandBus) {}

  @Put('/picture')
  @UseGuards(JwtAuthGuard)
  updatePicture(@Body() command: UpdateUserPicture, @Auth() issuer: Issuer) {
    return this.commandBus.execute(
      new UpdateUserPicture({ ...command, userId: issuer.id }),
    );
  }
}
