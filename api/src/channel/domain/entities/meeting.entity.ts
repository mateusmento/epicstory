import { Channel } from './channel.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { MeetingAttendee } from './meeting-attendee.entity';
import { CHANNEL_SCHEMA } from 'src/channel/constants';
import { Workspace } from 'src/workspace/domain/entities';
import { ScheduledMeetingOccurrence } from './scheduled-meeting-occurrence.entity';

@Entity({ schema: CHANNEL_SCHEMA, name: 'meetings' })
export class Meeting {
  @PrimaryGeneratedColumn()
  // @PrimaryGeneratedColumn('identity', { generatedIdentity: 'ALWAYS' })
  id: number;

  @Column()
  ongoing: boolean;

  @Column()
  workspaceId: number;
  @ManyToOne(() => Workspace, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspace_id' })
  workspace: Workspace;

  @OneToMany(() => MeetingAttendee, (p) => p.meeting, {
    cascade: ['insert', 'remove'],
  })
  attendees: MeetingAttendee[];

  @Column({ nullable: true })
  channelId?: number | null;

  @OneToOne(() => Channel, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn()
  channel?: Channel | null;

  @Column({ type: 'uuid', nullable: true })
  scheduledOccurrenceId?: string | null;

  @OneToOne(() => ScheduledMeetingOccurrence, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'scheduled_occurrence_id' })
  scheduledOccurrence?: ScheduledMeetingOccurrence | null;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  startsAt: Date;

  static ongoing(channel: number, workspaceId: number) {
    const meeting = new Meeting();
    meeting.ongoing = true;
    meeting.channelId = channel;
    meeting.workspaceId = workspaceId;
    meeting.attendees = [];
    return meeting;
  }

  static scheduled(data: {
    workspaceId: number;
    scheduledOccurrenceId: string;
    channelId?: number | null;
  }) {
    const meeting = new Meeting();
    meeting.ongoing = true;
    meeting.workspaceId = data.workspaceId;
    meeting.scheduledOccurrenceId = data.scheduledOccurrenceId;
    meeting.channelId = data.channelId ?? null;
    meeting.attendees = [];
    return meeting;
  }

  addAttendee(data: MeetingAttendee) {
    this.attendees.push(data);
  }
}
