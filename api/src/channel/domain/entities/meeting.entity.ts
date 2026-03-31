import { Channel } from './channel.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  RelationId,
  UpdateDateColumn,
} from 'typeorm';
import { MeetingAttendee } from './meeting-attendee.entity';
import { CHANNEL_SCHEMA } from 'src/channel/constants';
import { Workspace } from 'src/workspace/domain/entities';

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

  @ManyToOne(() => Channel, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'channel_id' })
  channel?: Channel | null;

  @RelationId((m: Meeting) => m.channel)
  channelId?: number | null;

  // Calendar-backed meeting occurrence identity (series-only)
  @Column({ type: 'uuid', nullable: true })
  calendarEventId?: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  occurrenceAt?: Date | null;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  startsAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  endedAt?: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  static ongoing(channelId: number, workspaceId: number) {
    const meeting = new Meeting();
    meeting.ongoing = true;
    meeting.channel = { id: channelId } as any satisfies Partial<Channel>;
    meeting.workspaceId = workspaceId;
    meeting.attendees = [];
    return meeting;
  }

  static scheduledFromCalendar(data: {
    workspaceId: number;
    calendarEventId: string;
    occurrenceAt: Date;
    channelId?: number | null;
  }) {
    const meeting = new Meeting();
    meeting.ongoing = true;
    meeting.workspaceId = data.workspaceId;
    meeting.calendarEventId = data.calendarEventId;
    meeting.occurrenceAt = data.occurrenceAt;
    meeting.channel =
      data.channelId != null
        ? ({ id: data.channelId } as any satisfies Partial<Channel>)
        : null;
    meeting.attendees = [];
    meeting.startsAt = data.occurrenceAt;
    return meeting;
  }

  addAttendee(data: MeetingAttendee) {
    this.attendees.push(data);
  }
}
