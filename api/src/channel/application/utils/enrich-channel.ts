import type { IChannel } from '@epicstory/contracts';
import {
  enrichMentionLabels,
  extractMentionIds,
  tiptapDocToPlainDisplayText,
} from '@epicstory/tiptap';
import { cloneDeep } from 'lodash';
import { User } from 'src/auth/domain/entities/user.entity';
import { Channel } from 'src/channel/domain/entities/channel.entity';

/**
 * Enriches a persisted {@link Channel} (with typical list relations) into the contract
 * {@link IChannel} shape used by list/search/find handlers — domain `Date` values stay
 * as `Date`; wire serialization is handled outside this function.
 */
export function enrichChannelForPreview(
  channel: Channel,
  viewerUserId: number,
): IChannel {
  const enriched = cloneDeep(channel) as unknown as IChannel;

  enriched.name = resolveChannelName(channel, viewerUserId);
  enriched.directPeer =
    enriched.type === 'direct'
      ? resolveDirectPeer(channel, viewerUserId)
      : undefined;
  enriched.unreadMessagesCount = 0;
  enriched.meeting = enriched.meeting ?? null;

  if (channel.lastMessage?.content) {
    const peers = channel.peers ?? [];
    const peerUsersMap = new Map(peers.map((u) => [u.id, u]));
    const mentionIds = extractMentionIds(channel.lastMessage.content);
    enriched.lastMessage.mentionedUsers = mentionIds
      .map((id) => peerUsersMap.get(id))
      .filter((u): u is User => u != null);
    enriched.lastMessage.displayContent = tiptapDocToPlainDisplayText(
      enrichMentionLabels(channel.lastMessage.content, peerUsersMap),
    );
  }

  return enriched;
}

export function enrichChannelsForPreview(
  channels: Channel[],
  viewerUserId: number,
): IChannel[] {
  return channels.map((ch) => enrichChannelForPreview(ch, viewerUserId));
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
