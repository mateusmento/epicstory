import { CHANNEL_SCHEMA } from 'src/channel/constants';
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Meeting } from './meeting.entity';
import { ScheduledMeeting } from './scheduled-meeting.entity';

@Entity({ schema: CHANNEL_SCHEMA, name: 'scheduled_meeting_occurrences' })
export class ScheduledMeetingOccurrence {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  scheduledMeetingId: string;
  @ManyToOne(() => ScheduledMeeting, { onDelete: 'CASCADE' })
  scheduledMeeting: ScheduledMeeting;

  @Column({ type: 'timestamptz' })
  startsAt: Date;

  @Column({ type: 'timestamptz' })
  endsAt: Date;

  @Column({ nullable: true })
  meetingId?: number | null;

  @ManyToOne(() => Meeting, { nullable: true, onDelete: 'SET NULL' })
  meeting?: Meeting | null;
}
