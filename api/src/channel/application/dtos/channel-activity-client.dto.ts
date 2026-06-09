import type { User } from 'src/auth';
import type { ChannelActivityType, IMessage } from '@epicstory/contracts';

/** Client shape for channel timeline activities (HTTP + WebSocket). */
export type ChannelActivityUserSummary = {
  id: number;
  name: string;
  picture?: string | null;
};

export type IChannelActivityClient = {
  id: number;
  channelId: number;
  type: ChannelActivityType;
  createdAt: string;
  actor: ChannelActivityUserSummary | null;
  messageId: number | null;
  meetingId: number | null;
  payload: Record<string, unknown> | null;
  /** Subject user for member add/remove when resolvable. */
  subjectUser?: ChannelActivityUserSummary | null;
  /** Present for `message_sent` when loaded for the requesting viewer (HTTP). */
  message?: IMessage | null;
};

export function userToSummary(u: User): ChannelActivityUserSummary {
  return {
    id: u.id,
    name: u.name,
    picture: u.picture,
  };
}
