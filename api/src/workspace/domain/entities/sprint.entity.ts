import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ schema: 'workspace' })
export class Sprint {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  workspaceId: number;

  @Column()
  projectId: number;

  @Column()
  createdById: number;

  @CreateDateColumn()
  createdAt: Date;
}
