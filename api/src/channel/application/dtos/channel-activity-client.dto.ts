import type { User } from 'src/auth';
import type { Meeting } from 'src/channel/domain';
import type {
  ChannelActivityType,
  IChannelActivityMeetingSummary,
} from '@epicstory/contracts';
import type { IMessagePayload } from '../services/message.service';

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
  /** Present for `meeting_started` when meeting exists. */
  meeting?: IChannelActivityMeetingSummary | null;
  /** Subject user for member add/remove when resolvable. */
  subjectUser?: ChannelActivityUserSummary | null;
  /** Present for `message_sent` when loaded for the requesting viewer (HTTP). */
  message?: IMessagePayload | null;
};

export function userToSummary(u: User): ChannelActivityUserSummary {
  return {
    id: u.id,
    name: u.name,
    picture: u.picture,
  };
}

export function meetingToChannelActivityMeetingSummary(
  m: Meeting,
): IChannelActivityMeetingSummary {
  const started = m.startedAt;
  const attendeeNames =
    m.attendees
      ?.map((a) => a.user?.name)
      .filter((n): n is string => typeof n === 'string' && n.trim() !== '') ??
    [];
  return {
    id: m.id,
    channelId: m.channelId ?? null,
    ongoing: m.ongoing,
    startedAt:
      started instanceof Date
        ? started.toISOString()
        : started
          ? String(started)
          : null,
    ...(attendeeNames.length > 0 ? { attendeeNames } : {}),
  };
}
