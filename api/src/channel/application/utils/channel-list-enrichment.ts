import { Channel } from 'src/channel/domain/entities/channel.entity';
import { extractMentionIds, renderMentions } from './mentions';

/**
 * Sidebar / list payloads: speakingTo for DMs, lastMessage mention rendering.
 * Shared by list queries and search.
 */
export function enrichChannelsForListView(
  channels: Channel[],
  viewerUserId: number,
): void {
  for (const channel of channels) {
    if (channel.type === 'direct')
      channel.speakingTo = channel.peers.find((p) => p.id !== viewerUserId);

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
