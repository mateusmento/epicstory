import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { IsNotEmpty } from 'class-validator';
import { Channel } from 'src/channel/domain/entities/channel.entity';
import { ChannelRepository } from 'src/channel/infrastructure/repositories/channel.repository';
import { Issuer } from 'src/core/auth';
import { patch } from 'src/core/objects';
import { IssuerUserIsNotWorkspaceMember } from 'src/workspace/domain/exceptions/issuer-user-is-not-workspace-member';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories/workspace.repository';

export class CreateChannel {
  workspaceId: number;
  issuer: Issuer;

  @IsNotEmpty()
  name: string;

  constructor(partial: Partial<CreateChannel>) {
    patch(this, partial);
  }
}

@CommandHandler(CreateChannel)
export class CreateChannelCommand implements ICommandHandler<CreateChannel> {
  constructor(
    private workspaceRepo: WorkspaceRepository,
    private channelRepo: ChannelRepository,
  ) {}

  async execute({ workspaceId, issuer, name }: CreateChannel) {
    const member = await this.workspaceRepo.findMember(workspaceId, issuer.id);
    if (!member) throw new IssuerUserIsNotWorkspaceMember();
    return this.channelRepo.save(Channel.create({ workspaceId, name }));
  }
}
