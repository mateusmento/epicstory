import { Injectable } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { OnEvent } from '@nestjs/event-emitter';
import { UserCreatedEvent } from 'src/auth/contracts/user-created.event';
import { create } from 'src/core/functions';
import { CreateProject } from '../features/create-project.command';
import { CreateWorkspace } from '../features/create-workspace.command';

@Injectable()
export class UserCreatedReaction {
  constructor(private commandBus: CommandBus) {}

  @OnEvent(UserCreatedEvent)
  async react(user: any) {
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
