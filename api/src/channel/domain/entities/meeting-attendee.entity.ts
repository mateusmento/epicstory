import { User } from 'src/auth';
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Meeting } from './meeting.entity';
import { CHANNEL_SCHEMA } from 'src/channel/constants';
import { patch } from 'src/core/objects';

@Entity({ schema: CHANNEL_SCHEMA, name: 'meeting_attendees' })
export class MeetingAttendee {
  @PrimaryGeneratedColumn()
  // @PrimaryGeneratedColumn('identity', { generatedIdentity: 'ALWAYS' })
  id: number;

  @Column({ nullable: false, unique: true })
  remoteId: string;

  @Column()
  userId: number;

  @ManyToOne(() => User)
  user: User;

  @Column()
  meetingId: number;

  @ManyToOne(() => Meeting)
  meeting: Meeting;

  @Column({ default: true })
  isCameraOn: boolean;

  @Column({ default: true })
  isMicrophoneOn: boolean;

  static of(data: {
    remoteId: string;
    userId: number;
    isCameraOn: boolean;
    isMicrophoneOn: boolean;
  }) {
    return patch(new MeetingAttendee(), data);
  }
}
