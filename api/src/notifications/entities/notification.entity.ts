import { UUID } from 'crypto';
import { patch } from 'src/core/objects';
import {
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
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

  @Column({ default: false })
  seen: boolean;

  @Column()
  workspaceId: number;
  @ManyToOne(() => Workspace, { onDelete: 'CASCADE' })
  workspace: Workspace;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  constructor(data: Partial<Notification>) {
    patch(this, data);
  }
}
