export const ChannelMemberAddedEvent = 'channel.memberAdded';

export type ChannelMemberAddedPayload = {
  channelId: number;
  workspaceId: number;
  userId: number;
};
