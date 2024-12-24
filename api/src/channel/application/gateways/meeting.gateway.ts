import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChannelRepository } from 'src/channel/infrastructure';
import { MeetingService } from '../services/meeting.service';

const channelMeetingRoom = (channelId) => `channel:${channelId}:meeting`;
const meetingRoom = (meetingId) => `meeting:${meetingId}`;

@WebSocketGateway()
export class MeetingGateway {
  @WebSocketServer()
  server: Server;

  constructor(
    private meetingService: MeetingService,
    private channelRepo: ChannelRepository,
  ) {}

  @SubscribeMessage('subscribe-meetings')
  async subscribeMeetings(
    @MessageBody() { userId, workspaceId }: any,
    @ConnectedSocket() socket: Socket,
  ) {
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

  @SubscribeMessage('request-meeting')
  async requestMeeting(
    @MessageBody() { channelId }: any,
    @ConnectedSocket() socket: Socket,
  ) {
    const meeting = await this.meetingService.startMeeting(channelId);
    socket
      .to(channelMeetingRoom(channelId))
      .emit('incoming-meeting', { meeting, channelId });
    return meeting;
  }

  @SubscribeMessage('join-meeting')
  async joinMeeting(
    @MessageBody() { meetingId, remoteId }: any,
    @ConnectedSocket() socket: Socket,
  ) {
    const user = (socket.request as any).user;
    const userId = user?.id;

    const meeting = await this.meetingService.joinMeeting(
      meetingId,
      remoteId,
      userId,
    );

    socket.leave(meetingRoom(meeting.id));
    socket.join(meetingRoom(meeting.id));

    socket
      .to(meetingRoom(meeting.id))
      .emit('attendee-joined', { meeting, remoteId, user });
    socket.to(channelMeetingRoom(meeting.channelId)).emit('incoming-attendee', {
      meetingId,
      channelId: meeting.channelId,
      remoteId,
      user,
    });

    socket.on('disconnect', async () => {
      try {
        await this.leaveMeeting({ meetingId, remoteId }, socket);
      } catch (ex) {
        console.log('WARNING: Exception on socket disconnect', ex);
      }
    });

    return meeting;
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
      socket
        .to(channelMeetingRoom(channelId))
        .emit('leaving-attendee', { meetingId, channelId, remoteId, user });
    } else {
      this.meetingService.endMeeting(meetingId);
      socket
        .to(channelMeetingRoom(channelId))
        .emit('meeting-ended', { meetingId, channelId });
      socket.emit('meeting-ended', { meetingId, channelId });
      this.server.socketsLeave(meetingRoom(meetingId));
    }
  }

  @SubscribeMessage('end-meeting')
  async endMeeting(
    @MessageBody() { meetingId }: any,
    @ConnectedSocket() socket: Socket,
  ) {
    const meeting = await this.meetingService.findMeeting(meetingId);
    this.meetingService.endMeeting(meetingId);
    socket
      .to(channelMeetingRoom(meeting.channelId))
      .emit('meeting-ended', { meetingId, channelId: meeting.channelId });
    socket.emit('meeting-ended', { meetingId, channelId: meeting.channelId });
    this.server.socketsLeave(meetingRoom(meetingId));
  }
}
