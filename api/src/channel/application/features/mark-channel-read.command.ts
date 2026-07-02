import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { patch } from 'src/core/objects';
import { ChannelMemberReadRepository } from 'src/channel/infrastructure/repositories/channel-member-read.repository';

export class MarkChannelRead {
  issuerId: number;
  channelId: number;

  constructor(data: Partial<MarkChannelRead> = {}) {
    patch(this, data);
  }
}

@CommandHandler(MarkChannelRead)
export class MarkChannelReadCommand
  implements ICommandHandler<MarkChannelRead>
{
  constructor(private readRepo: ChannelMemberReadRepository) {}

  async execute({ issuerId, channelId }: MarkChannelRead) {
    await this.readRepo.upsert(
      { userId: issuerId, channelId },
      {
        conflictPaths: ['userId', 'channelId'],
        skipUpdateIfNoValuesChanged: false,
      },
    );
  }
}
