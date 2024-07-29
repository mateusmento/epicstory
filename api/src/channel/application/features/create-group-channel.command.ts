import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { IsNotEmpty } from 'class-validator';
import { UserRepository } from 'src/auth';
import { Channel } from 'src/channel/domain/entities/channel.entity';
import { ChannelRepository } from 'src/channel/infrastructure/repositories/channel.repository';
import { Issuer } from 'src/core/auth';
import { patch } from 'src/core/objects';
import { IssuerUserIsNotWorkspaceMember } from 'src/workspace/domain/exceptions/issuer-user-is-not-workspace-member';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories/workspace.repository';

export class CreateGroupChannel {
  workspaceId: number;
  issuer: Issuer;

  @IsNotEmpty()
  name: string;

  constructor(partial: Partial<CreateGroupChannel>) {
    patch(this, partial);
  }
}

@CommandHandler(CreateGroupChannel)
export class CreateGroupChannelCommand
  implements ICommandHandler<CreateGroupChannel>
{
  constructor(
    private workspaceRepo: WorkspaceRepository,
    private channelRepo: ChannelRepository,
    private userRepo: UserRepository,
  ) {}

  async execute({ workspaceId, issuer, name }: CreateGroupChannel) {
    const member = await this.workspaceRepo.findMember(workspaceId, issuer.id);
    if (!member) throw new IssuerUserIsNotWorkspaceMember();
    const peer = await this.userRepo.findOneBy({ id: issuer.id });
    return this.channelRepo.save(
      Channel.create({ workspaceId, type: 'group', name, peers: [peer] }),
    );
  }
}
