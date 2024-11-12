import { Channel } from './channel.entity';
import {
  Column,
  Entity,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { MeetingAttendee } from './meeting-attendee.entity';
import { CHANNEL_SCHEMA } from 'src/channel/constants';

@Entity({ schema: CHANNEL_SCHEMA, name: 'meetings' })
export class Meeting {
  @PrimaryGeneratedColumn()
  // @PrimaryGeneratedColumn('identity', { generatedIdentity: 'ALWAYS' })
  id: number;

  @Column()
  ongoing: boolean;

  @OneToMany(() => MeetingAttendee, (p) => p.meeting, {
    cascade: ['insert', 'remove'],
  })
  attendees: MeetingAttendee[];

  @Column()
  channelId: number;

  @OneToOne(() => Channel)
  @JoinColumn()
  channel: Channel;

  static ongoing(channel: number) {
    const meeting = new Meeting();
    meeting.ongoing = true;
    meeting.channelId = channel;
    meeting.attendees = [];
    return meeting;
  }

  addAttendee(remoteId: string, userId: number) {
    this.attendees.push(MeetingAttendee.of(remoteId, userId));
  }
}
