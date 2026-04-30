import { Channel } from 'src/channel/domain/entities/channel.entity';
import { extractMentionIds, renderMentions } from './mentions';
import { User } from 'src/auth/domain/entities/user.entity';

/**
 * Sidebar / list payloads: speakingTo for DMs, lastMessage mention rendering.
 * Shared by list queries and search.
 */
export function enrichChannelsForListView(
  channels: Channel[],
  viewerUserId: number,
): void {
  for (const channel of channels) {
    channel.name = resolveChannelName(channel, viewerUserId);

    if (channel.type === 'direct')
      channel.speakingTo = resolveDirectPeer(channel, viewerUserId);

    if (!channel.lastMessage?.content) continue;

    const peerUsersMap = new Map(channel.peers.map((u) => [u.id, u]));
    const mentionIds = extractMentionIds(channel.lastMessage.content);

    (channel.lastMessage as any).mentionedUsers = mentionIds
      .map((id) => peerUsersMap.get(id))
      .filter(Boolean);
    (channel.lastMessage as any).displayContent = renderMentions(
      channel.lastMessage.content,
      peerUsersMap,
    );
  }
}

function resolveChannelName(channel: Channel, viewerUserId: number): string {
  if (channel.type === 'direct') {
    const directPeer = resolveDirectPeer(channel, viewerUserId);
    return directPeer.name;
  }
  if (channel.type === 'multi-direct') {
    return resolveChannelNameForMultiDirect(channel);
  }
  return channel.name ?? '';
}

function resolveDirectPeer(channel: Channel, viewerUserId: number): User {
  return channel.peers.find((p) => p.id !== viewerUserId)!;
}

function resolveChannelNameForMultiDirect(channel: Channel): string {
  const peerNames = channel.peers.map((p) => p.name).sort();
  const lastOne = peerNames.pop();
  if (peerNames.length === 0) return lastOne ?? '';
  return [...peerNames, `and ${lastOne}`].join(', ');
}
