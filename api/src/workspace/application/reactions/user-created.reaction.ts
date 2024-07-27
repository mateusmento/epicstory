import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { create } from 'src/core/functions';
import { User } from 'src/user/domain/entities/user.entity';

import { CreateProject } from '../features/create-project.command';
import { CreateWorkspace } from '../features/create-workspace.command';
import { CommandBus } from '@nestjs/cqrs';
import { UserCreatedEvent } from 'src/auth/contracts/user-created.event';

@Injectable()
export class UserCreatedReaction {
  constructor(private commandBus: CommandBus) {}

  @OnEvent(UserCreatedEvent)
  async react(user: User) {
    const workspace = await this.commandBus.execute(
      create(CreateWorkspace, {
        name: `${user.name}'s Workspace`,
        issuerId: user.id,
      }),
    );

    await this.commandBus.execute(
      create(CreateProject, {
        name: `My project`,
        issuerId: user.id,
        workspaceId: workspace.id,
      }),
    );
  }
}
