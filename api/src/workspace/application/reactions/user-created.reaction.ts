import { Injectable } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { OnEvent } from '@nestjs/event-emitter';
import { UserCreatedEvent } from 'src/auth/contracts/user-created.event';

@Injectable()
export class UserCreatedReaction {
  constructor(private commandBus: CommandBus) {}

  @OnEvent(UserCreatedEvent)
  async react() {}
}
