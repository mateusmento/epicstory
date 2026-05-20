import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

/** Repos linked to an Epicstory project for branch/PR flows (subset of workspace catalogue). */
@Entity({ schema: 'integration', name: 'project_github_repos' })
export class ProjectGithubRepo {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'project_id' })
  projectId: number;

  @Column()
  owner: string;

  @Column()
  name: string;

  @Column({ name: 'github_repo_id', type: 'bigint' })
  githubRepoId: string;

  @Column({ name: 'default_branch', nullable: true })
  defaultBranch?: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
