import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { PROJECT_SCHEMA } from 'src/project/constants';
import { Team } from 'src/workspace/domain/entities/team.entity';

export type SprintStatus = 'planned' | 'active' | 'completed';

@Entity({ schema: PROJECT_SCHEMA })
export class Sprint {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  teamId: number;

  @ManyToOne(() => Team, { onDelete: 'CASCADE' })
  team: Team;

  @Column()
  workspaceId: number;

  @Column()
  name: string;

  @Column({ default: 'planned' })
  status: SprintStatus;

  @Column({ type: 'timestamptz', nullable: true })
  startsAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  endsAt: Date | null;

  @Column()
  createdById: number;

  @CreateDateColumn()
  createdAt: Date;
}
