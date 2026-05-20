import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/** Member user-to-server OAuth token for GitHub (per user × workspace). */
@Entity({ schema: 'integration', name: 'github_user_connections' })
export class GithubUserConnection {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'workspace_id' })
  workspaceId: number;

  @Column({ name: 'user_id' })
  userId: number;

  @Column({ name: 'github_user_id', type: 'bigint' })
  githubUserId: string;

  @Column({ name: 'github_login' })
  githubLogin: string;

  @Column({ name: 'access_token_encrypted', type: 'text' })
  accessTokenEncrypted: string;

  @Column({ name: 'refresh_token_encrypted', type: 'text', nullable: true })
  refreshTokenEncrypted?: string | null;

  @Column({ name: 'token_expires_at', type: 'timestamptz', nullable: true })
  tokenExpiresAt?: Date | null;

  @Column({ default: 'active' })
  status: string;

  @Column({ name: 'revoked_at', type: 'timestamptz', nullable: true })
  revokedAt?: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
