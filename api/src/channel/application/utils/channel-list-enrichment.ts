import { Channel } from 'src/channel/domain/entities/channel.entity';
import { renderMentions } from './mentions';
import { User } from 'src/auth/domain/entities/user.entity';
import {
  extractMentionIdsFromDoc,
  messageBodyPlainText,
} from '@epicstory/tiptap';

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

    if (!channel.lastMessage) continue;

    const plain = messageBodyPlainText({
      content: channel.lastMessage.content,
    });
    if (!plain.trim()) continue;

    const peerUsersMap = new Map(channel.peers.map((u) => [u.id, u]));
    const mentionIds = extractMentionIdsFromDoc(channel.lastMessage.content);

    (channel.lastMessage as any).mentionedUsers = mentionIds
      .map((id) => peerUsersMap.get(id))
      .filter(Boolean);
    (channel.lastMessage as any).displayContent = renderMentions(
      plain,
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
