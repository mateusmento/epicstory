import { BadRequestException, Injectable } from '@nestjs/common';
import type {
  MessagePollBody,
  MessagePollClient,
  MessagePollSummary,
} from '@epicstory/contracts';
import {
  ChannelRepository,
  MessagePollVoteRepository,
  MessageRepository,
} from 'src/channel/infrastructure';
import {
  ChannelNotFound,
  IssuerIsNotChannelMember,
  MessageNotFound,
} from '../exceptions';
import type { MessagePollBody as MessagePollBodyDto } from '../dtos/message-poll.dto';
import { In } from 'typeorm';
import { Transactional } from 'typeorm-transactional';

@Injectable()
export class MessagePollService {
  constructor(
    private readonly pollVoteRepo: MessagePollVoteRepository,
    private readonly messageRepo: MessageRepository,
    private readonly channelRepo: ChannelRepository,
  ) {}

  normalizePollBody(body: MessagePollBodyDto): MessagePollBody {
    const options = body.options.map((o) => ({
      id: o.id.trim(),
      label: o.label.trim(),
    }));
    const ids = new Set(options.map((o) => o.id));
    if (ids.size !== options.length) {
      throw new BadRequestException('Duplicate poll option id.');
    }
    return {
      question: body.question.trim(),
      options,
    };
  }

  pollPlainSnippet(poll: MessagePollBody): string {
    const lines = poll.options.map((o) => `• ${o.label}`).join('\n');
    return `Poll: ${poll.question}\n${lines}`;
  }

  messagePollFingerprint(
    poll: MessagePollBody | null | undefined,
  ): string | null {
    if (!poll?.options?.length) return null;
    return JSON.stringify({
      q: poll.question.trim(),
      ids: [...poll.options.map((o) => o.id)].sort(),
    });
  }

  mergePersistedPollWithSummary(
    persisted: MessagePollBody,
    summary?: MessagePollSummary,
  ): MessagePollClient {
    const s = summary ?? {
      optionVotes: {},
      totalVotes: 0,
      myOptionId: null,
    };
    return { ...persisted, ...s };
  }

  async findPollSummariesForMessages(
    messageIds: number[],
    viewerId: number,
  ): Promise<Map<number, MessagePollSummary>> {
    const summaryMap = new Map<number, MessagePollSummary>();
    if (messageIds.length === 0) return summaryMap;

    for (const messageId of messageIds) {
      summaryMap.set(messageId, {
        optionVotes: {},
        totalVotes: 0,
        myOptionId: null,
      });
    }

    const votes = await this.pollVoteRepo
      .createQueryBuilder('v')
      .select('v.message_id', 'messageId')
      .addSelect('v.option_id', 'optionId')
      .addSelect('COUNT(*)', 'cnt')
      .where('v.message_id IN (:...ids)', { ids: messageIds })
      .groupBy('v.message_id')
      .addGroupBy('v.option_id')
      .getRawMany();

    const mine = await this.pollVoteRepo.find({
      where: { messageId: In(messageIds), userId: viewerId },
    });

    for (const vote of mine) {
      const summary = summaryMap.get(vote.messageId);
      if (summary) summary.myOptionId = vote.optionId;
    }

    for (const vote of votes) {
      const count = +vote.cnt;
      const summary = summaryMap.get(+vote.messageId);
      if (!summary) continue;
      summary.optionVotes[vote.optionId] = count;
      summary.totalVotes += count;
    }

    return summaryMap;
  }

  async mergePollForClient(
    messageId: number,
    persisted: MessagePollBody | null | undefined,
    viewerId: number,
  ): Promise<MessagePollClient | undefined> {
    if (!persisted) return undefined;
    const map = await this.findPollSummariesForMessages([messageId], viewerId);
    const summary = map.get(messageId) ?? {
      optionVotes: {},
      totalVotes: 0,
      myOptionId: null,
    };
    return this.mergePersistedPollWithSummary(persisted, summary);
  }

  async deleteVotesForMessage(messageId: number): Promise<void> {
    await this.pollVoteRepo.delete({ messageId });
  }

  @Transactional()
  async voteOnMessagePoll(
    messageId: number,
    issuerId: number,
    optionId: string,
  ): Promise<{ channelId: number; poll: MessagePollClient }> {
    const message = await this.messageRepo.findOne({
      where: { id: messageId },
    });
    if (!message) throw new MessageNotFound();

    const channel = await this.channelRepo.findOne({
      where: { id: message.channelId },
      relations: { peers: true },
    });
    if (!channel) throw new ChannelNotFound();

    if (
      channel.type !== 'workspace_open' &&
      !(channel.peers ?? []).some((p) => p.id === issuerId)
    ) {
      throw new IssuerIsNotChannelMember();
    }

    const persisted = message.poll;
    if (!persisted?.options?.length) {
      throw new BadRequestException('This message has no poll.');
    }

    const trimmed = optionId.trim();
    if (!persisted.options.some((o) => o.id === trimmed)) {
      throw new BadRequestException('Invalid poll option.');
    }

    const existing = await this.pollVoteRepo.findOne({
      where: { messageId, userId: issuerId },
    });
    if (existing) {
      existing.optionId = trimmed;
      await this.pollVoteRepo.save(existing);
    } else {
      await this.pollVoteRepo.save({
        messageId,
        userId: issuerId,
        optionId: trimmed,
      });
    }

    const summaryMap = await this.findPollSummariesForMessages(
      [messageId],
      issuerId,
    );
    const summary = summaryMap.get(messageId);
    if (!summary) throw new BadRequestException('Poll tally unavailable.');

    return {
      channelId: channel.id,
      poll: this.mergePersistedPollWithSummary(persisted, summary),
    };
  }
}
