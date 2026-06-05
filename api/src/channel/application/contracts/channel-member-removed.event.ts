export const ChannelMemberRemovedEvent = 'channel.memberRemoved';

export type ChannelMemberRemovedPayload = {
  channelId: number;
  workspaceId: number;
  userId: number;
};
