import type { IChannel, IMeeting } from '@epicstory/contracts';
import {
  enrichMentionLabels,
  tiptapDocToPlainDisplayText,
} from '@epicstory/tiptap';
import { User } from 'src/auth/domain/entities/user.entity';
import { Channel } from 'src/channel/domain/entities/channel.entity';
import { messageEntityToIMessageSummary } from './message-entity-to-imessage';
import { Message } from 'src/channel/domain';

/**
 * Enriches a persisted {@link Channel} (with typical list relations) into the contract
 * {@link IChannel} shape used by list/search/find handlers — domain `Date` values stay
 * as `Date`; wire serialization is handled outside this function.
 */
export function enrichChannelForPreview(
  channel: Channel,
  viewerUserId: number,
  unreadMessagesCount = 0,
): IChannel {
  const peers = channel.peers ?? [];
  const peerUsersMap = new Map(peers.map((u) => [u.id, u]));

  const lastMessage = channel.lastMessage
    ? lastMessageSummary(channel.lastMessage, peerUsersMap)
    : undefined;

  const directPeer =
    channel.type === 'direct'
      ? resolveDirectPeer(channel, viewerUserId)
      : undefined;

  return {
    id: channel.id,
    type: channel.type,
    name: resolveChannelName(channel, viewerUserId),
    workspaceId: channel.workspaceId,
    teamId: channel.teamId,
    createdAt: channel.createdAt,
    directPeer,
    lastMessage,
    unreadMessagesCount,
    meeting: (channel.meeting as IMeeting | undefined) ?? null,
    peers,
  };
}

function lastMessageSummary(
  lastMessage: Message,
  peerUsersMap: Map<number, User>,
) {
  const displayContent = lastMessage.content
    ? tiptapDocToPlainDisplayText(
        enrichMentionLabels(lastMessage.content, peerUsersMap),
      )
    : undefined;

  const sender = lastMessage.sender ?? peerUsersMap.get(lastMessage.senderId);

  return lastMessage
    ? messageEntityToIMessageSummary(lastMessage, {
        displayContent,
        sender,
      })
    : undefined;
}

export function enrichChannelsForPreview(
  channels: Channel[],
  viewerUserId: number,
  unreadCounts: number[] = [],
): IChannel[] {
  return channels.map((ch, idx) =>
    enrichChannelForPreview(ch, viewerUserId, unreadCounts[idx] ?? 0),
  );
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
  return `${peerNames.join(', ')} and ${lastOne}`;
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
