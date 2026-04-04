import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  RelationId,
  UpdateDateColumn,
} from 'typeorm';
import { UUID } from 'crypto';
import { cached, patch, patchEntity } from 'src/core/objects';
import { Workspace } from 'src/workspace/domain/entities';
import { User } from 'src/auth/domain/entities';
import type { CalendarEventPayload } from '../types';
import { pickBy } from 'lodash';
import { ScheduledJob } from 'src/scheduling/entities';
import { differenceInMilliseconds } from 'date-fns';

export type CalendarEventRecurrence =
  | { frequency: 'once'; until?: string }
  | { frequency: 'daily'; interval?: number; until?: string }
  | {
      frequency: 'weekly';
      interval?: number;
      byWeekday?: number[]; // 0..6
      until?: string;
    };

export type CalendarEventType = 'event' | 'meeting';

@Entity({ schema: 'calendar', name: 'calendar_events' })
export class CalendarEvent {
  @PrimaryGeneratedColumn('uuid')
  id: UUID;

  @Column({ default: 'event' })
  type: CalendarEventType;

  @Column({ type: 'timestamptz' })
  startsAt: Date;

  @Column({ type: 'timestamptz' })
  endsAt: Date;

  @Column({ default: '' })
  title: string;

  @Column({ default: '' })
  description: string;

  @Column({ default: true })
  isPublic: boolean;

  @Column({ default: true })
  notifyEnabled: boolean;

  @Column({ default: 1 })
  notifyMinutesBefore: number;

  @Column({ type: 'jsonb' })
  recurrence: CalendarEventRecurrence;

  @ManyToMany(() => User)
  @JoinTable({
    name: 'calendar_event_participants',
    joinColumn: { name: 'calendar_event_id' },
    inverseJoinColumn: { name: 'user_id' },
  })
  participants: User[];

  @Column({ type: 'jsonb' })
  payload: CalendarEventPayload;

  @Column()
  workspaceId: number;

  @ManyToOne(() => Workspace, { onDelete: 'CASCADE' })
  workspace: Workspace;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column()
  createdById: number;

  @ManyToOne(() => User)
  createdBy: User;

  @OneToOne(() => ScheduledJob, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'scheduled_job_id' })
  scheduledJob?: ScheduledJob | null;

  @RelationId((event: CalendarEvent) => event.scheduledJob)
  scheduledJobId?: UUID | null;

  constructor(data: Partial<CalendarEvent>) {
    patch(this, data);
  }

  static create(data: Partial<CalendarEvent>) {
    return new CalendarEvent({
      ...data,
      isPublic: data.isPublic ?? true,
      notifyEnabled: data.notifyEnabled ?? true,
      notifyMinutesBefore: data.notifyMinutesBefore ?? 10,
      recurrence: data.recurrence ?? { frequency: 'once' },
    });
  }

  hasParticipant(userId: number) {
    if (!this.isPublic) {
      const isParticipant =
        this.createdById === userId ||
        (this.participants ?? []).some((u) => u.id === userId);
      if (!isParticipant) return false;
    }
    return true;
  }

  #duration = cached((startsAt: Date, endsAt: Date) => {
    if (!endsAt) return;
    const durationMs = Math.max(0, differenceInMilliseconds(endsAt, startsAt));
    return durationMs;
  });

  duration() {
    return this.#duration(this.endsAt, this.startsAt);
  }
}

export function patchCalendarEvent(
  event: CalendarEvent,
  partial: Partial<CalendarEvent>,
) {
  partial = pickBy(partial, (v) => v != null);
  patchEntity(event, partial);
  if (partial.notifyMinutesBefore)
    event.notifyMinutesBefore = Math.max(0, partial.notifyMinutesBefore ?? 0);
}
