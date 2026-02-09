import { User } from 'src/auth';
import { create } from 'src/core/objects';
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { WorkspaceRole } from '../values';
import { isBefore } from 'date-fns';
import { Workspace } from '.';

@Entity()
export class WorkspaceMemberInvite {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  workspaceId: number;

  @ManyToOne(() => Workspace, { onDelete: 'CASCADE' })
  workspace: Workspace;

  @Column()
  email: string;

  @Column({ nullable: true })
  userId?: number;

  @ManyToOne(() => User)
  user: User;

  @Column({ nullable: true })
  role?: WorkspaceRole;

  @Column()
  status: 'accepted' | 'rejected' | 'sent';

  @Column()
  expiresAt: Date;

  static create(data: Partial<WorkspaceMemberInvite> = {}) {
    return create(WorkspaceMemberInvite, data);
  }

  hasExpired() {
    return isBefore(this.expiresAt, new Date());
  }
}
