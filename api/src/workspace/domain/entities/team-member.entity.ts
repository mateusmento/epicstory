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

  @ManyToOne(() => Team)
  team: Team;

  static create({
    teamId,
    userId,
    workspaceMemberId,
  }: {
    teamId: number;
    userId: number;
    workspaceMemberId: number;
  }) {
    return create(TeamMember, { teamId, userId, workspaceMemberId });
  }
}
