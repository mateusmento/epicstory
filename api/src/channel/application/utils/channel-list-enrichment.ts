import { Channel } from 'src/channel/domain/entities/channel.entity';
import { User } from 'src/auth/domain/entities/user.entity';
import {
  enrichMentionLabels,
  extractMentionIds,
  tiptapDocToPlainDisplayText,
} from '@epicstory/tiptap';

/**
 * Sidebar / list payloads: directPeer for DMs, lastMessage mention rendering.
 * Shared by list queries and search.
 */
export function enrichChannelsForListView(
  channels: Channel[],
  viewerUserId: number,
): void {
  for (const channel of channels) {
    channel.name = resolveChannelName(channel, viewerUserId);

    if (channel.type === 'direct')
      channel.directPeer = resolveDirectPeer(channel, viewerUserId);

    if (!channel.lastMessage?.content) continue;

    const peerUsersMap = new Map(channel.peers.map((u) => [u.id, u]));
    const mentionIds = extractMentionIds(channel.lastMessage.content as any);

    (channel.lastMessage as any).mentionedUsers = mentionIds
      .map((id) => peerUsersMap.get(id))
      .filter(Boolean);
    (channel.lastMessage as any).displayContent = tiptapDocToPlainDisplayText(
      enrichMentionLabels(channel.lastMessage.content as any, peerUsersMap),
    );
  }
}

function resolveChannelName(channel: Channel, viewerUserId: number): string {
  if (channel.type === 'direct' || channel.type === 'multi-direct') {
    return resolveChannelNameForMultiDirect(channel, viewerUserId);
  }
  return channel.name?.trim() ?? '';
}

function resolveDirectPeer(channel: Channel, viewerUserId: number): User {
  return channel.peers.find((p) => p.id !== viewerUserId)!;
}

function resolveChannelNameForMultiDirect(
  channel: Channel,
  viewerUserId: number,
): string {
  const peerNames = channel.peers
    .filter((p) => p.id !== viewerUserId)
    .map((p) => p.name.trim())
    .filter(Boolean)
    .sort();
  const lastOne = peerNames.pop();
  if (peerNames.length === 0) return lastOne ?? '';
  return [...peerNames, `and ${lastOne}`].join(', ');
}

export function getChannelLabelForNotification(
  channel: Channel,
  recipientUserId?: number,
): string {
  const name = channel.name?.trim();
  if (name) return name;
  const peers = channel.peers ?? [];
  if (channel.type === 'direct' || channel.type === 'multi-direct') {
    const peerNames = peers
      .filter((p) => recipientUserId == null || p.id !== recipientUserId)
      .map((p) => p.name)
      .filter(Boolean);
    if (peerNames.length) return peerNames.join(', ');
    if (peers.length)
      return peers
        .map((p) => p.name)
        .filter(Boolean)
        .join(', ');
  }
  if (channel.type === 'meeting') return 'Meeting';
  if (channel.type === 'workspace_open') return 'Team';
  return 'Chat';
}
