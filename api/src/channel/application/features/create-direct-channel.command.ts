import { CommandBus, CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { IsNumber, IsOptional } from 'class-validator';
import { Issuer } from 'src/core/auth';
import { patch } from 'src/core/objects';
import { CreateMultiDirectChannel } from './create-multi-direct-channel.command';

export class CreateDirectChannel {
  workspaceId: number;
  issuer: Issuer;

  @IsOptional()
  @IsNumber()
  teamId?: number;

  @IsNumber()
  peerId: number;

  constructor(partial: Partial<CreateDirectChannel>) {
    patch(this, partial);
  }
}

@CommandHandler(CreateDirectChannel)
export class CreateDirectChannelCommand
  implements ICommandHandler<CreateDirectChannel>
{
  constructor(private commandBus: CommandBus) {}

  async execute(command: CreateDirectChannel) {
    const { workspaceId, teamId, issuer, peerId } = command;
    return this.commandBus.execute(
      new CreateMultiDirectChannel({
        workspaceId,
        issuer,
        teamId,
        peers: [peerId],
      }),
    );
  }
}
