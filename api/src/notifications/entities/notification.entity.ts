import { UUID } from 'crypto';
import { patch } from 'src/core/objects';
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { ScheduledEvent } from './scheduled-event.entity';
import { Workspace } from 'src/workspace/domain/entities';

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

  @Column({ type: 'timestamptz', default: () => 'now()' })
  createdAt: Date;

  @Column({ default: false })
  seen: boolean;

  @Column()
  workspaceId: number;
  @ManyToOne(() => Workspace, { onDelete: 'CASCADE' })
  workspace: Workspace;

  constructor(data: Partial<Notification>) {
    patch(this, data);
  }

  static fromEvent(event: ScheduledEvent) {
    return new Notification({
      type: 'scheduled_event',
      userId: event.userId,
      payload: event.payload,
      createdAt: new Date(),
      seen: false,
    });
  }
}
