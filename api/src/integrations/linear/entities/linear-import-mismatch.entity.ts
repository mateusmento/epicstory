import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ schema: 'integration', name: 'linear_import_mismatches' })
export class LinearImportMismatch {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'uuid' })
  jobId: string;

  @Column()
  type: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'jsonb', default: () => `'{}'::jsonb` })
  payload: any;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
