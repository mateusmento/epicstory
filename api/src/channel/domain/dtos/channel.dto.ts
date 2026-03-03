import { User } from 'src/auth';
import { patch } from 'src/core/objects';
import { Channel } from '../entities';
import {
  extractMentionIds,
  renderMentions,
} from '../../application/utils/mentions';

export class ChannelDto extends Channel {
  speakingTo: User;
  picture: string;
  unreadMessagesCount: number;

  constructor(data: Partial<ChannelDto>) {
    super();
    patch(this, data);
  }
}

export function mapChannelToDto(entity: Channel, issuerId: number): ChannelDto {
  const dto = new ChannelDto({
    ...entity,
    speakingTo: entity.peers.find((p) => p.id !== issuerId),
    picture: entity.peers.find((p) => p.id !== issuerId)?.picture,
    unreadMessagesCount: 0,
  });

  if (dto.type === 'direct') {
    dto.name = entity.peers.find((p) => p.id !== issuerId)?.name;
  } else if (dto.type === 'multi-direct') {
    dto.name = dto.peers
      .filter((p) => p.id !== issuerId)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((p) => p.name)
      .join(', ');
  }

  if (dto.type === 'direct')
    dto.speakingTo = dto.peers.find((p) => p.id !== issuerId);

  if (dto.lastMessage?.content) {
    const peerUsersMap = new Map(dto.peers.map((u) => [u.id, u]));
    const mentionIds = extractMentionIds(dto.lastMessage.content);

    (dto.lastMessage as any).mentionedUsers = mentionIds
      .map((id) => peerUsersMap.get(id))
      .filter(Boolean);
    (dto.lastMessage as any).displayContent = renderMentions(
      dto.lastMessage.content,
      peerUsersMap,
    );
  }

  return dto;
}
