import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ schema: 'integration', name: 'linear_team_map' })
export class LinearTeamMap {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  linearConnectionId: number;

  @Column()
  linearTeamId: string;

  @Column()
  epicTeamId: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}

@Entity({ schema: 'integration', name: 'linear_project_map' })
export class LinearProjectMap {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  linearConnectionId: number;

  @Column()
  linearProjectId: string;

  @Column()
  epicProjectId: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}

@Entity({ schema: 'integration', name: 'linear_issue_map' })
export class LinearIssueMap {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  linearConnectionId: number;

  @Column()
  linearIssueId: string;

  @Column()
  epicIssueId: number;

  @Column()
  epicBacklogItemId: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}

@Entity({ schema: 'integration', name: 'linear_user_map' })
export class LinearUserMap {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  linearConnectionId: number;

  @Column()
  linearUserId: string;

  @Column({ nullable: true })
  epicUserId?: number | null;

  @Column({ nullable: true })
  emailSnapshot?: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
