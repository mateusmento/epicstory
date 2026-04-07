import { isFuture } from 'date-fns';
import { CHANNEL_SCHEMA } from 'src/channel/constants';
import { create, patch } from 'src/core/objects';
import { Workspace } from 'src/workspace/domain/entities';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Channel } from './channel.entity';
import { MeetingAttendee } from './meeting-attendee.entity';
import { UUID } from 'crypto';

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

  @Column({ nullable: true })
  channelId?: number | null;

  @Column({ type: 'uuid', nullable: true })
  calendarEventId?: UUID | null;

  @Column({ type: 'timestamptz', nullable: true })
  occurrenceAt?: Date | null;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  startedAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  endedAt?: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  scheduledStartsAt?: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  scheduledEndsAt?: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  constructor(data: Partial<Meeting> = {}) {
    patch(this, data);
  }

  static create(data: Partial<Meeting> = {}) {
    const scheduledStartElapsed =
      !!data.scheduledStartsAt && !isFuture(data.scheduledStartsAt);

    const meeting = new Meeting({
      workspaceId: data.workspaceId,
      channel: create(Channel, { id: data.channelId }),
      channelId: data.channelId,
      attendees: [],
      scheduledStartsAt: data.scheduledStartsAt,
      scheduledEndsAt: data.scheduledEndsAt,
      // if no scheduled start time or the scheduled start time has elapsed, the meeting is ongoing
      ongoing: !data.scheduledStartsAt || scheduledStartElapsed,
      // For scheduled meetings we keep startedAt aligned with the scheduled start time until an explicit "start" updates it.
      startedAt: data.scheduledStartsAt ?? new Date(),

      calendarEventId: data.calendarEventId,
      occurrenceAt: data.occurrenceAt,
    });

    return meeting;
  }

  static ongoing(channelId: number, workspaceId: number) {
    const meeting = new Meeting();
    meeting.ongoing = true;
    meeting.channel = create(Channel, { id: channelId });
    meeting.channelId = channelId;
    meeting.workspaceId = workspaceId;
    meeting.attendees = [];
    meeting.startedAt = new Date();
    return meeting;
  }

  static scheduledFromCalendar(data: {
    workspaceId: number;
    calendarEventId: UUID;
    occurrenceAt: Date;
    channelId?: number | null;
  }) {
    const meeting = new Meeting();
    meeting.ongoing = true;
    meeting.workspaceId = data.workspaceId;
    meeting.calendarEventId = data.calendarEventId;
    meeting.occurrenceAt = data.occurrenceAt;
    meeting.channel =
      data.channelId != null ? create(Channel, { id: data.channelId }) : null;
    meeting.attendees = [];
    meeting.startedAt = data.occurrenceAt;
    return meeting;
  }

  addAttendee(data: MeetingAttendee) {
    this.attendees.push(data);
  }
}
