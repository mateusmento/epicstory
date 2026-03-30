import {
  ConnectedSocket,
  MessageBody,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Meeting, MeetingAttendee } from 'src/channel/domain';
import { ChannelRepository } from 'src/channel/infrastructure';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories/workspace.repository';
import {
  MeetingHasntStartedException,
  MeetingNotFoundException,
} from '../exceptions';
import { MeetingService } from '../services/meeting.service';

const channelMeetingRoom = (channelId) => `channel:${channelId}:meeting`;
const meetingRoom = (meetingId) => `meeting:${meetingId}`;
const workspaceMeetingRoom = (workspaceId) =>
  `workspace:${workspaceId}:meetings`;

@WebSocketGateway()
export class MeetingGateway implements OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private meetingService: MeetingService,
    private channelRepo: ChannelRepository,
    private workspaceRepo: WorkspaceRepository,
  ) {}

  emitMeetingSessionStarted(meeting: Meeting) {
    this.server
      .to(workspaceMeetingRoom(meeting.workspaceId))
      .emit('meeting-session-started', {
        meeting,
        workspaceId: meeting.workspaceId,
        channelId: meeting.channelId ?? meeting.channel?.id ?? null,
      });
  }

  async handleDisconnect(socket: Socket) {
    try {
      if (!socket.data.meetingAttendee) return;
      const { meetingId, remoteId } = socket.data.meetingAttendee;
      await this.leaveMeeting({ meetingId, remoteId }, socket);
    } catch (ex) {
      if (ex instanceof MeetingNotFoundException) {
        console.log('WARNING: Leaving a not found meeting');
      } else {
        console.log('WARNING: Exception on socket disconnect', ex);
      }
    }
  }

  @SubscribeMessage('subscribe-meetings')
  async subscribeMeetings(
    @MessageBody() { workspaceId }: any,
    @ConnectedSocket() socket: Socket,
  ) {
    const user = (socket.request as any).user;
    const userId = user?.id;

    const channels = await this.channelRepo
      .createQueryBuilder('channel')
      .innerJoin('channel.peers', 'peer')
      .where('peer.id = :userId', { userId })
      .where('channel.workspaceId = :workspaceId', { workspaceId })
      .getMany();

    for (const channel of channels) {
      socket.leave(channelMeetingRoom(channel.id));
      socket.join(channelMeetingRoom(channel.id));
    }
  }

  @SubscribeMessage('subscribe-workspace-meetings')
  async subscribeWorkspaceMeetings(
    @MessageBody() { workspaceId }: any,
    @ConnectedSocket() socket: Socket,
  ) {
    const user = (socket.request as any).user;
    const userId = user?.id;
    const member = await this.workspaceRepo.findMember(workspaceId, userId);
    if (!member) return;
    socket.leave(workspaceMeetingRoom(workspaceId));
    socket.join(workspaceMeetingRoom(workspaceId));
  }

  @SubscribeMessage('join-meeting')
  async joinMeeting(
    @MessageBody() { channelId, remoteId, isCameraOn, isMicrophoneOn }: any,
    @ConnectedSocket() socket: Socket,
  ) {
    const user = (socket.request as any).user;
    const userId = user?.id;

    const attendee = MeetingAttendee.of({
      remoteId,
      userId,
      isCameraOn,
      isMicrophoneOn,
    });

    let meeting: Meeting;

    try {
      meeting = await this.meetingService.findOngoingMeeting(channelId);
      meeting = await this.meetingService.joinMeeting(meeting, attendee);
      const data = { attendee, meeting };
      socket.to(meetingRoom(meeting.id)).emit('attendee-joined', data);
      socket.to(channelMeetingRoom(channelId)).emit('incoming-attendee', data);
    } catch (ex) {
      if (!(ex instanceof MeetingHasntStartedException)) throw ex;

      meeting = await this.meetingService.startMeeting(channelId, attendee);

      this.server
        .to(channelMeetingRoom(channelId))
        .emit('incoming-meeting', { meeting, channelId });

      this.server
        .to(workspaceMeetingRoom(meeting.workspaceId))
        .emit('meeting-session-started', {
          meeting,
          workspaceId: meeting.workspaceId,
          channelId,
        });
    }

    socket.leave(meetingRoom(meeting.id));
    socket.join(meetingRoom(meeting.id));

    socket.data.meetingAttendee = { meetingId: meeting.id, remoteId };

    return meeting;
  }

  @SubscribeMessage('join-meeting-session')
  async joinMeetingSession(
    @MessageBody() { meetingId, remoteId, isCameraOn, isMicrophoneOn }: any,
    @ConnectedSocket() socket: Socket,
  ) {
    const user = (socket.request as any).user;
    const userId = user?.id;

    const meeting = await this.meetingService.findMeeting(meetingId);

    const member = await this.workspaceRepo.findMember(
      meeting.workspaceId,
      userId,
    );
    if (!member) return;

    const attendee = MeetingAttendee.of({
      remoteId,
      userId,
      isCameraOn,
      isMicrophoneOn,
    });

    const joined = await this.meetingService.joinMeeting(meeting, attendee);
    const data = { attendee, meeting: joined };

    socket.to(meetingRoom(meetingId)).emit('attendee-joined', data);
    this.server
      .to(workspaceMeetingRoom(joined.workspaceId))
      .emit('meeting-attendee-joined', {
        meetingId: joined.id,
        workspaceId: joined.workspaceId,
        channelId: joined.channelId,
        attendee,
      });

    socket.leave(meetingRoom(meetingId));
    socket.join(meetingRoom(meetingId));
    socket.data.meetingAttendee = { meetingId: joined.id, remoteId };

    return joined;
  }

  @SubscribeMessage('leave-meeting')
  async leaveMeeting(
    @MessageBody() { meetingId, remoteId }: any,
    @ConnectedSocket() socket: Socket,
  ) {
    const user = (socket.request as any).user;

    const { channelId } = await this.meetingService.findMeeting(meetingId);

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
      const meeting = await this.meetingService.findMeeting(meetingId);
      this.meetingService.endMeeting(meetingId);
      if (channelId) this.emitMeetingEnded(channelId, meetingId, this.server);
      this.server
        .to(workspaceMeetingRoom(meeting.workspaceId))
        .emit('meeting-session-ended', {
          meetingId,
          workspaceId: meeting.workspaceId,
          channelId: meeting.channelId,
        });
      this.server.socketsLeave(meetingRoom(meetingId));
    }

    delete socket.data.meetingAttendee;
  }

  @SubscribeMessage('camera-toggled')
  async cameraToggled(@MessageBody() { meetingId, remoteId, enabled }: any) {
    const { channelId } = await this.meetingService.findMeeting(meetingId);
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
    const { channelId } = await this.meetingService.findMeeting(meetingId);
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

  @SubscribeMessage('end-meeting')
  async endMeeting(
    @MessageBody() { meetingId }: any,
    @ConnectedSocket() socket: Socket,
  ) {
    const meeting = await this.meetingService.findMeeting(meetingId);
    this.meetingService.endMeeting(meetingId);
    if (meeting.channelId)
      this.emitMeetingEnded(meeting.channelId, meetingId, this.server);
    this.server
      .to(workspaceMeetingRoom(meeting.workspaceId))
      .emit('meeting-session-ended', {
        meetingId,
        workspaceId: meeting.workspaceId,
        channelId: meeting.channelId,
      });
    this.server.socketsLeave(meetingRoom(meetingId));
    delete socket.data.meetingAttendee;
  }

  emitMeetingEnded(
    channelId: number,
    meetingId: number,
    socket: Socket | Server,
  ) {
    const data = { meetingId, channelId };
    socket.to(channelMeetingRoom(channelId)).emit('meeting-ended', data);
    socket.to(meetingRoom(meetingId)).emit(`current-meeting-ended`, data);
  }
}
