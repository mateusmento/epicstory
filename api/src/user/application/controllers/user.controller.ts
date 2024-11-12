import { Body, Controller, Post } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { CreateUser } from '../features/create-user.command';

@Controller('users')
export class UserController {
  constructor(private commandBus: CommandBus) {}

  @Post()
  create(@Body() command: CreateUser) {
    return this.commandBus.execute(command);
  }
}
