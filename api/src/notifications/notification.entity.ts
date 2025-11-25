import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { UUID } from 'crypto';
import { ScheduledEvent } from './scheduled-event.entity';
import { patch } from 'src/core/objects';

@Entity({ schema: 'scheduler', name: 'notifications' })
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: UUID;

  @Column()
  type: string;

  @Column()
  userId: number;

  @Column({ type: 'jsonb' })
  payload: any;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @Column({ default: false })
  seen: boolean;

  constructor(data: Partial<Notification>) {
    patch(this, data);
  }

  static fromEvent(event: ScheduledEvent) {
    return new Notification({
      type: 'scheduled_event',
      userId: event.userId,
      payload: event.payload,
      seen: false,
    });
  }
}
