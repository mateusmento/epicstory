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
import { Meeting } from 'src/channel/domain';

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

  @SubscribeMessage('join-meeting')
  async joinMeeting(
    @MessageBody() { channelId, remoteId }: any,
    @ConnectedSocket() socket: Socket,
  ) {
    const user = (socket.request as any).user;
    const userId = user?.id;

    let meeting = await this.meetingService.findOngoingMeeting(channelId);

    if (meeting) {
      meeting.addAttendee(remoteId, userId);
      meeting = await this.meetingService.save(meeting);
      const meetingId = meeting.id;
      socket
        .to(meetingRoom(meetingId))
        .emit('attendee-joined', { meetingId, channelId, remoteId, user });
      socket
        .to(channelMeetingRoom(channelId))
        .emit('incoming-attendee', { meetingId, channelId, remoteId, user });
    } else {
      meeting = Meeting.ongoing(channelId);
      meeting.addAttendee(remoteId, userId);
      meeting = await this.meetingService.save(meeting);
      socket
        .to(channelMeetingRoom(channelId))
        .emit('incoming-meeting', { meeting, channelId });
      socket.emit('incoming-meeting', { meeting, channelId });
    }

    socket.leave(meetingRoom(meeting.id));
    socket.join(meetingRoom(meeting.id));

    socket.on('disconnect', async () => {
      try {
        await this.leaveMeeting({ meetingId: meeting.id, remoteId }, socket);
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
      socket.leave(meetingRoom(meetingId));
    } else {
      this.meetingService.endMeeting(meetingId);
      socket
        .to(channelMeetingRoom(channelId))
        .emit('meeting-ended', { meetingId, channelId });
      socket.emit('meeting-ended', { meetingId, channelId });
      socket
        .to(meetingRoom(meetingId))
        .emit(`meeting:${meetingId}:ended`, { meetingId, channelId });
      socket.emit(`meeting:${meetingId}:ended`, { meetingId, channelId });
      this.server.socketsLeave(meetingRoom(meetingId));
    }
  }

  @SubscribeMessage('end-meeting')
  async endMeeting(
    @MessageBody() { meetingId }: any,
    @ConnectedSocket() socket: Socket,
  ) {
    const { channelId } = await this.meetingService.findMeeting(meetingId);
    this.meetingService.endMeeting(meetingId);
    socket
      .to(channelMeetingRoom(channelId))
      .emit('meeting-ended', { meetingId, channelId: channelId });
    socket.emit('meeting-ended', { meetingId, channelId: channelId });
    socket
      .to(meetingRoom(meetingId))
      .emit(`meeting:${meetingId}:ended`, { meetingId, channelId });
    socket.emit(`meeting:${meetingId}:ended`, { meetingId, channelId });
    this.server.socketsLeave(meetingRoom(meetingId));
  }
}
