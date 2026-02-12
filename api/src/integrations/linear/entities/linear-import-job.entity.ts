import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ schema: 'integration', name: 'linear_import_jobs' })
export class LinearImportJob {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  linearConnectionId: number;

  @Column()
  workspaceId: number;

  @Column()
  createdByUserId: number;

  @Column({ default: 'pending' })
  status: string;

  @Column({ type: 'jsonb' })
  params: any;

  @Column({ type: 'jsonb', default: () => `'{}'::jsonb` })
  progress: any;

  @Column({ type: 'text', nullable: true })
  lastError?: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  startedAt?: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  finishedAt?: Date | null;

  @Column({ type: 'uuid', nullable: true })
  lockId?: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  lockedAt?: Date | null;

  @Column({ default: 0 })
  retryCount: number;

  @Column({ type: 'timestamptz', nullable: true })
  lastRetryAt?: Date | null;
}
