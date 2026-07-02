import type { IChannel } from "@epicstory/contracts";

export function channelActivityAt(channel: IChannel): number {
  const at = channel.lastMessage?.sentAt ?? channel.createdAt;
  return new Date(at).getTime();
}

export function sortChannelsByRecentActivity(channels: IChannel[]): IChannel[] {
  return [...channels].sort((a, b) => channelActivityAt(b) - channelActivityAt(a));
}
