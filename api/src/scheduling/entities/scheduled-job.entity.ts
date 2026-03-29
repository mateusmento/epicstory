import { UUID } from 'crypto';
import { patch } from 'src/core/objects';
import { Workspace } from 'src/workspace/domain/entities';
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { SCHEDULING_SCHEMA } from '../constants';

export type Recurrence =
  | {
      frequency: 'once';
    }
  | {
      frequency: 'daily';
      timeOfDay: string; // ISO date-time
    }
  | {
      frequency: 'weekly';
      weekdays: number[]; // 0=Sun .. 6=Sat
      timeOfDay: string; // ISO date-time
    };

@Entity({ schema: SCHEDULING_SCHEMA, name: 'scheduled_jobs' })
export class ScheduledJob {
  @PrimaryGeneratedColumn('uuid')
  id: UUID;

  @Column({ nullable: true })
  type: string;

  @Column({ type: 'jsonb' })
  payload: any;

  @Column({ type: 'timestamptz' })
  dueAt: Date;

  @Column({ default: 1 })
  notifyMinutesBefore: number;

  @Column({ type: 'jsonb' })
  recurrence: Recurrence;

  @Column({ default: false })
  processed: boolean;

  @Column({ type: 'uuid', nullable: true })
  lockId?: UUID;

  @Column({ type: 'timestamptz', nullable: true })
  lockedAt?: Date;

  @Column({ default: 0 })
  retryCount: number;

  @Column({ type: 'text', nullable: true })
  lastError?: string;

  @Column({ type: 'timestamptz', nullable: true })
  lastRetryAt?: Date;

  @Column()
  workspaceId: number;
  @ManyToOne(() => Workspace, { onDelete: 'CASCADE' })
  workspace: Workspace;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  constructor(data: Partial<ScheduledJob>) {
    patch(this, data);
  }

  static create(
    data: Pick<
      ScheduledJob,
      | 'type'
      | 'payload'
      | 'dueAt'
      | 'workspaceId'
      | 'notifyMinutesBefore'
      | 'recurrence'
    >,
  ) {
    return new ScheduledJob({
      ...data,
      processed: false,
    });
  }
}
