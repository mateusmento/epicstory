import { WORKSPACE_SCHEMA } from 'src/workspace/constants';
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Team } from './team.entity';
import { create } from 'src/core/objects';
import { User } from 'src/auth';

@Entity({ schema: WORKSPACE_SCHEMA })
export class TeamMember {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @ManyToOne(() => User)
  user: User;

  @Column()
  workspaceMemberId: number;

  @Column()
  teamId: number;

  @ManyToOne(() => Team, { onDelete: 'CASCADE' })
  team: Team;

  @Column({ default: 'now()' })
  joinedAt: Date;

  static create(data: {
    userId: number;
    workspaceMemberId: number;
    teamId: number;
    joinedAt?: Date;
  }) {
    return create(TeamMember, data);
  }
}
