import { User } from 'src/auth';
import { CHANNEL_SCHEMA } from 'src/channel/constants';
import { Workspace } from 'src/workspace/domain/entities';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Channel } from './channel.entity';
import { ScheduledMeetingOccurrence } from './scheduled-meeting-occurrence.entity';

export type ScheduledMeetingRecurrence =
  | {
      frequency: 'once';
    }
  | {
      frequency: 'daily';
      interval: number; // every N days
      until?: string; // ISO date-time
    }
  | {
      frequency: 'weekly';
      interval: number; // every N weeks
      byWeekday: number[]; // 0=Sun .. 6=Sat
      until?: string; // ISO date-time
    };

@Entity({ schema: CHANNEL_SCHEMA, name: 'scheduled_meetings' })
export class ScheduledMeeting {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  workspaceId: number;
  @ManyToOne(() => Workspace, { onDelete: 'CASCADE' })
  workspace: Workspace;

  @Column({ nullable: true })
  channelId?: number | null;
  @ManyToOne(() => Channel, { nullable: true, onDelete: 'SET NULL' })
  channel?: Channel | null;

  @Column()
  createdById: number;
  @ManyToOne(() => User)
  createdBy: User;

  @Column({ default: '' })
  title: string;

  @Column({ default: '' })
  description: string;

  @Column({ default: true })
  isPublic: boolean;

  @Column({ default: 1 })
  notifyMinutesBefore: number;

  @Column({ type: 'jsonb' })
  recurrence: ScheduledMeetingRecurrence;

  @ManyToMany(() => User)
  @JoinTable({
    name: 'scheduled_meeting_participants',
    joinColumn: { name: 'scheduled_meeting_id' },
    inverseJoinColumn: { name: 'user_id' },
  })
  participants: User[];

  @OneToMany(() => ScheduledMeetingOccurrence, (o) => o.scheduledMeeting, {
    cascade: ['insert', 'remove'],
  })
  occurrences: ScheduledMeetingOccurrence[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
