import { User } from 'src/auth';
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Meeting } from './meeting.entity';
import { CHANNEL_SCHEMA } from 'src/channel/constants';

@Entity({ schema: CHANNEL_SCHEMA, name: 'meeting_attendees' })
export class MeetingAttendee {
  @PrimaryGeneratedColumn()
  // @PrimaryGeneratedColumn('identity', { generatedIdentity: 'ALWAYS' })
  id: number;

  @Column()
  remoteId: string;

  @Column()
  userId: number;

  @ManyToOne(() => User)
  user: User;

  @Column()
  meetingId: number;

  @ManyToOne(() => Meeting)
  meeting: Meeting;

  static of(remoteId: string, userId: number) {
    const attendee = new MeetingAttendee();
    attendee.remoteId = remoteId;
    attendee.userId = userId;
    return attendee;
  }
}
