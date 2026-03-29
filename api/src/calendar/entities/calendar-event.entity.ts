import {
  Column,
  CreateDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UUID } from 'crypto';
import { patch } from 'src/core/objects';
import { Workspace } from 'src/workspace/domain/entities';
import { User } from 'src/auth/domain/entities';
import type { CalendarEventPayload } from '../types';

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

  constructor(data: Partial<CalendarEvent>) {
    patch(this, data);
  }

  static create(data: Partial<CalendarEvent>) {
    return new CalendarEvent(data);
  }
}
