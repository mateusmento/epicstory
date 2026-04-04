import { UnauthorizedException } from '@nestjs/common';
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
import { isDate } from 'date-fns';
import { Server, Socket } from 'socket.io';
import { CalendarEvent } from 'src/calendar/entities';
import { Meeting, MeetingAttendee } from 'src/channel/domain';
import { ChannelRepository } from 'src/channel/infrastructure';
import { RedisService } from 'src/core/redis.service';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories/workspace.repository';
import { DataSource } from 'typeorm';
import { MeetingNotFoundException } from '../exceptions';
import { JoinScheduledMeeting } from '../features/meeting/join-scheduled-meeting.command';
import { JoinChannelMeeting } from '../features/meeting/join-channel-meeting.command';
import { JoinMeeting } from '../features/meeting/join-meeting.command';
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
  server: Server;

  private readonly socketMeetingTtlSeconds = 60 * 60 * 12; // 12h
  private readonly socketMeetingTtlRefreshEveryMs = 60 * 60 * 1000; // 1h
  private ttlRefreshTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private dataSource: DataSource,
    private meetingService: MeetingService,
    private channelRepo: ChannelRepository,
    private workspaceRepo: WorkspaceRepository,
    private commandBus: CommandBus,
    private redis: RedisService,
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
    if (meeting.channelId) {
      this.server
        .to(channelMeetingRoom(meeting.channelId))
        .except(issuerId ? userRoom(issuerId) : [])
        .emit('incoming-meeting', { meeting, channelId: meeting.channelId });
    }

    if (meeting.calendarEventId) {
      this.server
        .to(scheduledMeetingRoom(meeting.calendarEventId))
        .except(issuerId ? userRoom(issuerId) : [])
        .emit('incoming-meeting', {
          meeting,
          calendarEventId: meeting.calendarEventId,
        });
    }
  }

  emitAttendeeJoined(meeting: Meeting, attendee: MeetingAttendee) {
    this.server
      .to(meetingRoom(meeting.id))
      .except(userRoom(attendee.userId))
      .emit('attendee-joined', { attendee, meeting });

    if (meeting.channelId) {
      this.server
        .to(channelMeetingRoom(meeting.channelId))
        .except(userRoom(attendee.userId))
        .emit('incoming-attendee', { attendee, meeting });
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

  async handleDisconnect(socket: Socket) {
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
    @MessageBody() { meetingId }: any,
    @ConnectedSocket() socket: Socket,
  ) {
    const data = await this.getSocketMeetingAttendee(socket.id);
    if (!data) return;
    if (meetingId != null && data.meetingId !== meetingId) return;
    await this.touchSocketMeetingAttendee(socket.id);
  }

  @SubscribeMessage('subscribe-meetings')
  async subscribeMeetings(
    @MessageBody() { workspaceId }: any,
    @ConnectedSocket() socket: Socket,
  ) {
    const user = (socket.request as any).user;
    const userId = user?.id;

    const member = await this.workspaceRepo.findMember(workspaceId, userId);
    if (!member) return;

    const channels = await this.channelRepo
      .createQueryBuilder('channel')
      .innerJoin('channel.peers', 'peer')
      .where('channel.workspaceId = :workspaceId', { workspaceId })
      .andWhere('peer.id = :userId', { userId })
      .getMany();

    const events = await this.dataSource
      .createQueryBuilder(CalendarEvent, 'event')
      .leftJoin('event.participants', 'participant')
      .where('event.workspaceId = :workspaceId', { workspaceId })
      .andWhere('event.type = :type', { type: 'meeting' })
      .andWhere('participant.id = :userId OR event.createdById = :userId', {
        userId,
      })
      .getMany();

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
    { meetingId, remoteId, isCameraOn, isMicrophoneOn }: any,
    @ConnectedSocket() socket: Socket,
  ) {
    const issuerId = (socket.request as any).user?.id;
    if (!issuerId) throw new UnauthorizedException();

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
    }: any,
    @ConnectedSocket() socket: Socket,
  ) {
    const issuerId = (socket.request as any).user?.id;
    if (!issuerId) throw new UnauthorizedException();

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
        calendarEventId,
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
    @MessageBody() { channelId, remoteId, isCameraOn, isMicrophoneOn }: any,
    @ConnectedSocket() socket: Socket,
  ) {
    const issuerId = (socket.request as any).user?.id;
    if (!issuerId) throw new UnauthorizedException();

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
  async cameraToggled(@MessageBody() { meetingId, remoteId, enabled }: any) {
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
  async microphoneToggled(
    @MessageBody() { meetingId, remoteId, enabled }: any,
  ) {
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

  @SubscribeMessage('leave-meeting')
  async leaveMeeting(
    @MessageBody() { meetingId, remoteId }: any,
    @ConnectedSocket() socket: Socket,
  ) {
    const user = (socket.request as any).user;

    const meeting = await this.meetingService.findMeeting({ meetingId });
    if (!meeting) throw new Error('Meeting not found');

    const channelId = meeting?.channelId;

    const attendeesCount = await this.meetingService.leaveMeeting(
      meetingId,
      remoteId,
    );

    if (attendeesCount > 0) {
      socket.to(meetingRoom(meetingId)).emit('attendee-left', { remoteId });
      if (channelId) {
        socket
          .to(channelMeetingRoom(channelId))
          .emit('leaving-attendee', { meetingId, channelId, remoteId, user });
      }
      socket.leave(meetingRoom(meetingId));
    } else {
      await this.meetingService.endMeeting(meetingId);
      this.emitMeetingEnded(meeting, socket);
      this.server.socketsLeave(meetingRoom(meetingId));
    }

    await this.clearSocketMeetingAttendee(socket.id);
  }

  @SubscribeMessage('end-meeting')
  async endMeeting(
    @MessageBody() { meetingId }: any,
    @ConnectedSocket() socket: Socket,
  ) {
    const meeting = await this.meetingService.findMeeting({ meetingId });
    if (!meeting) throw new MeetingNotFoundException();

    await this.meetingService.endMeeting(meetingId);

    this.emitMeetingEnded(meeting, socket);

    this.server.socketsLeave(meetingRoom(meetingId));

    await this.clearSocketMeetingAttendee(socket.id);
  }

  async emitMeetingEnded(meeting: Meeting, socket: Socket) {
    const data = { meetingId: meeting.id, channelId: meeting.channelId };

    this.server.to(meetingRoom(meeting.id)).emit('current-meeting-ended', data);

    if (meeting.channelId) {
      this.server
        .to(channelMeetingRoom(meeting.channelId))
        .emit('meeting-ended', data);
    } else if (meeting.calendarEventId) {
      this.server
        .to(scheduledMeetingRoom(meeting.calendarEventId))
        .emit('meeting-ended', data);
    } else {
      this.server.to(meetingRoom(meeting.id)).emit('meeting-ended', data);
    }
  }
}
