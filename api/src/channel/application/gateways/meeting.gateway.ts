import type {
  EndMeetingBody,
  IMeeting,
  IMeetingAttendee,
  JoinChannelMeetingBody,
  JoinMeetingBody,
  JoinScheduledMeetingBody,
  LeaveMeetingBody,
  MeetingHeartbeatBody,
  MeetingMediaToggleBody,
  SubscribeMeetingsBody,
} from '@epicstory/contracts';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { UUID } from 'crypto';
import { isDate } from 'date-fns';
import { CalendarEventRepository } from 'src/calendar/repositories';
import { Meeting, MeetingAttendee } from 'src/channel/domain';
import { ChannelRepository } from 'src/channel/infrastructure';
import { AuthenticatedSocket, EpicstoryServer } from 'src/core';
import { RedisService } from 'src/core/redis.service';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories/workspace.repository';
import { MeetingNotFoundException } from '../exceptions';
import { JoinChannelMeeting } from '../features/meeting/join-channel-meeting.command';
import { JoinMeeting } from '../features/meeting/join-meeting.command';
import { JoinScheduledMeeting } from '../features/meeting/join-scheduled-meeting.command';
import { MeetingService } from '../services/meeting.service';

const channelMeetingRoom = (channelId) =>
  `channel:${channelId}:meeting` as const;
const scheduledMeetingRoom = (calendarEventId) =>
  `calendar-event:${calendarEventId}:meeting` as const;
const meetingRoom = (meetingId) => `meeting:${meetingId}` as const;
const userRoom = (userId) => `user:${userId}` as const;

@WebSocketGateway()
export class MeetingGateway implements OnGatewayDisconnect, OnGatewayInit {
  @WebSocketServer()
  server: EpicstoryServer;

  private readonly socketMeetingTtlSeconds = 60 * 60 * 12; // 12h
  private readonly socketMeetingTtlRefreshEveryMs = 60 * 60 * 1000; // 1h
  private ttlRefreshTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private meetingService: MeetingService,
    private channelRepo: ChannelRepository,
    private workspaceRepo: WorkspaceRepository,
    private commandBus: CommandBus,
    private redis: RedisService,
    private calendarEventRepo: CalendarEventRepository,
  ) {}

  afterInit() {
    this.startSocketMeetingTtlRefresher();
  }

  private startSocketMeetingTtlRefresher() {
    if (this.ttlRefreshTimer) return;
    this.ttlRefreshTimer = setInterval(() => {
      // fire-and-forget; errors are logged in the task
      this.refreshLocalSocketMeetingTtls().catch((err) =>
        console.log('WARNING: Failed to refresh socket meeting TTLs', err),
      );
    }, this.socketMeetingTtlRefreshEveryMs);
  }

  private async refreshLocalSocketMeetingTtls() {
    // Only touch keys for sockets that are *currently* in a meeting room.
    // This avoids extending TTL for stale mappings when a socket is no longer in a meeting.
    const localSockets = Array.from(this.server.sockets.sockets.values());
    const socketIdsInMeetings = localSockets
      .filter((s) =>
        Array.from(s.rooms).some(
          (room) => typeof room === 'string' && room.startsWith('meeting:'),
        ),
      )
      .map((s) => s.id);

    if (socketIdsInMeetings.length === 0) return;

    // Batch Redis calls to keep it cheap.
    const chunkSize = 500;
    for (let i = 0; i < socketIdsInMeetings.length; i += chunkSize) {
      const chunk = socketIdsInMeetings.slice(i, i + chunkSize);
      const multi = this.redis.client.multi();
      for (const socketId of chunk) {
        multi.expire(
          this.socketMeetingKey(socketId),
          this.socketMeetingTtlSeconds,
        );
      }
      await multi.exec();
    }
  }

  emitIncomingMeeting(meeting: Meeting, issuerId?: number) {
    const meetingPayload = meeting as unknown as IMeeting;

    if (meeting.channelId) {
      this.server
        .to(channelMeetingRoom(meeting.channelId))
        .except(issuerId ? userRoom(issuerId) : [])
        .emit('incoming-meeting', {
          meeting: meetingPayload,
          channelId: meeting.channelId,
        });
    }

    if (meeting.calendarEventId) {
      this.server
        .to(scheduledMeetingRoom(meeting.calendarEventId))
        .except(issuerId ? userRoom(issuerId) : [])
        .emit('incoming-meeting', {
          meeting: meetingPayload,
          calendarEventId: meeting.calendarEventId,
        });
    }
  }

  emitAttendeeJoined(meeting: Meeting, attendee: MeetingAttendee) {
    const joined = {
      attendee: attendee as unknown as IMeetingAttendee,
      meeting: meeting as unknown as IMeeting,
    };

    this.server
      .to(meetingRoom(meeting.id))
      .except(userRoom(attendee.userId))
      .emit('attendee-joined', joined);

    if (meeting.channelId) {
      this.server
        .to(channelMeetingRoom(meeting.channelId))
        .except(userRoom(attendee.userId))
        .emit('incoming-attendee', joined);
    }
  }

  async joinMeetingRoom(userId: number, meetingId: number, remoteId: string) {
    const sockets = await this.server.in(userRoom(userId)).fetchSockets();
    sockets.forEach((socket) => {
      socket.leave(meetingRoom(meetingId));
      socket.join(meetingRoom(meetingId));
    });

    // Cross-node state: store by socket.id in Redis so disconnect handlers work on any node.
    await Promise.all(
      sockets.map((socket) =>
        this.setSocketMeetingAttendee(socket.id, { meetingId, remoteId }),
      ),
    );
  }

  async handleDisconnect(socket: AuthenticatedSocket) {
    try {
      const data = await this.getSocketMeetingAttendee(socket.id);
      if (!data) return;
      const { meetingId, remoteId } = data;
      await this.leaveMeeting({ meetingId, remoteId }, socket);
    } catch (ex) {
      if (ex instanceof MeetingNotFoundException) {
        console.log('WARNING: Leaving a not found meeting');
      } else {
        console.log('WARNING: Exception on socket disconnect', ex);
      }
    }
  }

  private socketMeetingKey(socketId: string) {
    return `socket:${socketId}:meetingAttendee` as const;
  }

  private async setSocketMeetingAttendee(
    socketId: string,
    data: { meetingId: number; remoteId: string },
  ) {
    await this.redis.client.set(
      this.socketMeetingKey(socketId),
      JSON.stringify(data),
      { EX: this.socketMeetingTtlSeconds },
    );
  }

  private async getSocketMeetingAttendee(socketId: string) {
    const raw = await this.redis.client.get(this.socketMeetingKey(socketId));
    if (!raw) return null;
    try {
      return JSON.parse(raw) as { meetingId: number; remoteId: string };
    } catch {
      return null;
    }
  }

  private async clearSocketMeetingAttendee(socketId: string) {
    await this.redis.client.del(this.socketMeetingKey(socketId));
  }

  private async touchSocketMeetingAttendee(socketId: string) {
    await this.redis.client.expire(
      this.socketMeetingKey(socketId),
      this.socketMeetingTtlSeconds,
    );
  }

  @SubscribeMessage('meeting-heartbeat')
  async meetingHeartbeat(
    @MessageBody() { meetingId }: MeetingHeartbeatBody,
    @ConnectedSocket() socket: AuthenticatedSocket,
  ) {
    const data = await this.getSocketMeetingAttendee(socket.id);
    if (!data) return;
    if (meetingId != null && data.meetingId !== meetingId) return;
    await this.touchSocketMeetingAttendee(socket.id);
  }

  @SubscribeMessage('subscribe-meetings')
  async subscribeMeetings(
    @MessageBody() { workspaceId }: SubscribeMeetingsBody,
    @ConnectedSocket() socket: AuthenticatedSocket,
  ) {
    const { userId } = socket.data;
    if (!Number.isFinite(userId)) return;

    const member = await this.workspaceRepo.findMember(workspaceId, userId);
    if (!member) return;

    const channels = await this.channelRepo.findChannelsUserIsMember(
      userId,
      workspaceId,
    );

    const events = await this.calendarEventRepo.findCalendarEventsForUser(
      userId,
      workspaceId,
    );

    socket.leave(userRoom(userId));
    socket.join(userRoom(userId));

    for (const channel of channels) {
      socket.leave(channelMeetingRoom(channel.id));
      socket.join(channelMeetingRoom(channel.id));
    }

    for (const event of events) {
      socket.leave(scheduledMeetingRoom(event.id));
      socket.join(scheduledMeetingRoom(event.id));
    }
  }

  @SubscribeMessage('join-meeting')
  async joinMeeting(
    @MessageBody()
    { meetingId, remoteId, isCameraOn, isMicrophoneOn }: JoinMeetingBody,
    @ConnectedSocket() socket: AuthenticatedSocket,
  ) {
    const { userId: issuerId } = socket.data;
    if (!Number.isFinite(issuerId)) throw new UnauthorizedException();

    if (!meetingId) throw new Error('Invalid request: missing meetingId');

    socket.leave(userRoom(issuerId));
    socket.join(userRoom(issuerId));

    const meeting: Meeting = await this.commandBus.execute(
      new JoinMeeting({
        meetingId,
        issuerId,
        remoteId,
        isCameraOn,
        isMicrophoneOn,
      }),
    );

    return meeting;
  }

  @SubscribeMessage('join-scheduled-meeting')
  async joinScheduledMeeting(
    @MessageBody()
    {
      calendarEventId,
      occurrenceAt,
      remoteId,
      isCameraOn,
      isMicrophoneOn,
    }: JoinScheduledMeetingBody,
    @ConnectedSocket() socket: AuthenticatedSocket,
  ) {
    const { userId: issuerId } = socket.data;
    if (!Number.isFinite(issuerId)) throw new UnauthorizedException();

    if (!calendarEventId || !occurrenceAt) {
      throw new Error(
        'Invalid request: missing calendarEventId or occurrenceAt',
      );
    }

    const d = new Date(occurrenceAt);
    if (!isDate(d)) throw new Error('Invalid occurrenceAt');

    socket.leave(userRoom(issuerId));
    socket.join(userRoom(issuerId));

    const meeting: Meeting = await this.commandBus.execute(
      new JoinScheduledMeeting({
        calendarEventId: calendarEventId as UUID,
        occurrenceAt: d,
        issuerId,
        remoteId,
        isCameraOn,
        isMicrophoneOn,
      }),
    );

    return meeting;
  }

  @SubscribeMessage('join-channel-meeting')
  async joinChannelMeeting(
    @MessageBody()
    { channelId, remoteId, isCameraOn, isMicrophoneOn }: JoinChannelMeetingBody,
    @ConnectedSocket() socket: AuthenticatedSocket,
  ) {
    const { userId: issuerId } = socket.data;
    if (!Number.isFinite(issuerId)) throw new UnauthorizedException();

    socket.leave(userRoom(issuerId));
    socket.join(userRoom(issuerId));

    const meeting: Meeting = await this.commandBus.execute(
      new JoinChannelMeeting({
        channelId,
        issuerId,
        remoteId,
        isCameraOn,
        isMicrophoneOn,
      }),
    );

    return meeting;
  }

  @SubscribeMessage('camera-toggled')
  async cameraToggled(@MessageBody() body: MeetingMediaToggleBody) {
    const { meetingId, remoteId, enabled } = body;
    const { channelId } = await this.meetingService.findMeeting({ meetingId });
    await this.meetingService.updateAttendee(meetingId, remoteId, {
      isCameraOn: enabled,
    });
    this.server
      .to(meetingRoom(meetingId))
      .emit('camera-toggled', { remoteId, enabled });
    if (channelId) {
      this.server
        .to(channelMeetingRoom(channelId))
        .emit('camera-toggled', { meetingId, channelId, remoteId, enabled });
    }
  }

  @SubscribeMessage('microphone-toggled')
  async microphoneToggled(@MessageBody() body: MeetingMediaToggleBody) {
    const { meetingId, remoteId, enabled } = body;
    const { channelId } = await this.meetingService.findMeeting({ meetingId });
    await this.meetingService.updateAttendee(meetingId, remoteId, {
      isMicrophoneOn: enabled,
    });
    this.server
      .to(meetingRoom(meetingId))
      .emit('microphone-toggled', { remoteId, enabled });
    if (channelId) {
      this.server.to(channelMeetingRoom(channelId)).emit('microphone-toggled', {
        meetingId,
        channelId,
        remoteId,
        enabled,
      });
    }
  }

  @SubscribeMessage('screen-share-toggled')
  async screenShareToggled(@MessageBody() body: MeetingMediaToggleBody) {
    const { meetingId, remoteId, enabled } = body;
    const { channelId } = await this.meetingService.findMeeting({ meetingId });
    await this.meetingService.updateAttendee(meetingId, remoteId, {
      isScreenSharing: enabled,
    });
    this.server
      .to(meetingRoom(meetingId))
      .emit('screen-share-toggled', { remoteId, enabled });
    if (channelId) {
      this.server
        .to(channelMeetingRoom(channelId))
        .emit('screen-share-toggled', {
          meetingId,
          channelId,
          remoteId,
          enabled,
        });
    }
  }

  @SubscribeMessage('leave-meeting')
  async leaveMeeting(
    @MessageBody() { meetingId, remoteId }: LeaveMeetingBody,
    @ConnectedSocket() socket: AuthenticatedSocket,
  ) {
    const { userId } = socket.data;

    const meeting = await this.meetingService.findMeeting({ meetingId });
    if (!meeting) throw new Error('Meeting not found');

    const channelId = meeting?.channelId;
    const channel =
      channelId !== null && channelId !== undefined
        ? await this.channelRepo.findOneBy({ id: channelId })
        : null;
    const isPersistentMeetingChannel = channel?.type === 'meeting';

    const attendeesCount = await this.meetingService.leaveMeeting(
      meetingId,
      remoteId,
    );

    // Always emit the attendee-left event. If the room is empty, there will be no receivers anyway.
    socket.to(meetingRoom(meetingId)).emit('attendee-left', { remoteId });
    if (channelId) {
      socket
        .to(channelMeetingRoom(channelId))
        .emit('leaving-attendee', { meetingId, channelId, remoteId, userId });
    }
    socket.leave(meetingRoom(meetingId));

    // For regular meetings, we end the meeting when the last attendee leaves.
    // For "meeting channels", the meeting is persistent (always ongoing) and must never end.
    if (attendeesCount <= 0 && !isPersistentMeetingChannel) {
      await this.meetingService.endMeeting(meetingId);
      this.emitMeetingEnded(meeting);
      this.server.socketsLeave(meetingRoom(meetingId));
    }

    await this.clearSocketMeetingAttendee(socket.id);
  }

  @SubscribeMessage('end-meeting')
  async endMeeting(
    @MessageBody() { meetingId }: EndMeetingBody,
    @ConnectedSocket() socket: AuthenticatedSocket,
  ) {
    const meeting = await this.meetingService.findMeeting({ meetingId });
    if (!meeting) throw new MeetingNotFoundException();

    if (meeting.channelId) {
      const channel = await this.channelRepo.findOneBy({
        id: meeting.channelId,
      });
      if (channel?.type === 'meeting') {
        throw new BadRequestException(
          'Meeting channels are persistent and cannot be ended',
        );
      }
    }

    await this.meetingService.endMeeting(meetingId);

    this.emitMeetingEnded(meeting);

    this.server.socketsLeave(meetingRoom(meetingId));

    await this.clearSocketMeetingAttendee(socket.id);
  }

  async emitMeetingEnded(meeting: Meeting) {
    const ended = {
      meetingId: meeting.id,
      channelId: meeting.channelId ?? undefined,
    };

    this.server.to(meetingRoom(meeting.id)).emit('current-meeting-ended', {
      meetingId: meeting.id,
      channelId: meeting.channelId,
    });

    if (meeting.channelId) {
      this.server
        .to(channelMeetingRoom(meeting.channelId))
        .emit('meeting-ended', ended);
    } else if (meeting.calendarEventId) {
      this.server
        .to(scheduledMeetingRoom(meeting.calendarEventId))
        .emit('meeting-ended', ended);
    } else {
      this.server.to(meetingRoom(meeting.id)).emit('meeting-ended', ended);
    }
  }
}
