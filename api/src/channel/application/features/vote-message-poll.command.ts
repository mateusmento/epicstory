import type { VoteMessagePollBody as VoteMessagePollBodyContract } from '@epicstory/contracts';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { IsNotEmpty, IsString } from 'class-validator';
import { patch } from 'src/core/objects';
import { MessageGateway } from '../gateways/message.gateway';
import { MessagePollService } from '../services/message-poll.service';

export class VoteMessagePollBody implements VoteMessagePollBodyContract {
  @IsNotEmpty()
  @IsString()
  optionId: string;
}

export class VoteMessagePoll {
  messageId: number;
  issuerId: number;

  @IsNotEmpty()
  @IsString()
  optionId: string;

  constructor(data: Partial<VoteMessagePoll>) {
    patch(this, data);
  }
}

@CommandHandler(VoteMessagePoll)
export class VoteMessagePollCommand
  implements ICommandHandler<VoteMessagePoll>
{
  constructor(
    private messagePolls: MessagePollService,
    private messageGateway: MessageGateway,
  ) {}

  async execute({ messageId, issuerId, optionId }: VoteMessagePoll) {
    const { channelId, poll } = await this.messagePolls.voteOnMessagePoll(
      messageId,
      issuerId,
      optionId,
    );

    this.messageGateway.emitMessagePollUpdated(channelId, messageId, {
      optionVotes: poll.optionVotes,
      totalVotes: poll.totalVotes,
    });

    return {
      success: true,
      channelId,
      messageId,
      poll,
    };
  }
}
