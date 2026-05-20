import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/** GitHub App installation for a workspace (one install per workspace). */
@Entity({ schema: 'integration', name: 'github_installations' })
export class GithubInstallation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'workspace_id', unique: true })
  workspaceId: number;

  /** GitHub `installation.id` (large integer). */
  @Column({ name: 'github_installation_id', type: 'bigint', unique: true })
  githubInstallationId: string;

  @Column({ name: 'account_login' })
  accountLogin: string;

  /** Typically `Organization` or `User` from payload. */
  @Column({ name: 'account_type' })
  accountType: string;

  @Column({ name: 'suspended_at', type: 'timestamptz', nullable: true })
  suspendedAt?: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
