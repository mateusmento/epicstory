import type { ChannelType } from 'src/channel/domain/entities/channel.entity';

export const ChannelMessageDeletedEvent = 'channel.MessageDeleted';

export type ChannelMessageDeletedPayload = {
  messageId: number;
  channelId: number;
  channelType: ChannelType;
};
