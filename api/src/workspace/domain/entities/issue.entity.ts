import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ schema: 'workspace' })
export class Issue {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ default: '' })
  title: string;

  @Column({ default: '' })
  description: string;

  @Column()
  workspaceId: number;

  @Column()
  projectId: number;

  @Column()
  createdBy: number;

  @CreateDateColumn()
  createdAt: Date;
}
