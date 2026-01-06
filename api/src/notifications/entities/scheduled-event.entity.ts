import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { UUID } from 'crypto';
import { patch } from 'src/core/objects';

@Entity({ schema: 'scheduler', name: 'scheduled_events' })
export class ScheduledEvent {
  @PrimaryGeneratedColumn('uuid')
  id: UUID;

  @Column()
  userId: number;

  @Column({ type: 'jsonb' })
  payload: any;

  @Column({ type: 'timestamptz' })
  dueAt: Date;

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

  constructor(data: Partial<ScheduledEvent>) {
    patch(this, data);
  }

  static create(data: Pick<ScheduledEvent, 'userId' | 'payload' | 'dueAt'>) {
    return new ScheduledEvent({
      ...data,
      processed: false,
    });
  }
}
