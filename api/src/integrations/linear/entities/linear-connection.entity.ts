import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ schema: 'integration', name: 'linear_connections' })
export class LinearConnection {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  workspaceId?: number | null;

  @Column({ nullable: true })
  userId?: number | null;

  @Column()
  createdByUserId: number;

  @Column()
  linearOrgId: string;

  @Column()
  linearOrgName: string;

  @Column({ type: 'text' })
  accessTokenEncrypted: string;

  @Column({ type: 'text', nullable: true })
  refreshTokenEncrypted?: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  tokenExpiresAt?: Date | null;

  @Column({ default: 'active' })
  status: string;

  @Column({ type: 'timestamptz', nullable: true })
  revokedAt?: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
