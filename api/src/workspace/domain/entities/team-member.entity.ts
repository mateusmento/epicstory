import { WORKSPACE_SCHEMA } from 'src/workspace/constants';
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Team } from './team.entity';

@Entity({ schema: WORKSPACE_SCHEMA })
export class TeamMember {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: string;

  @Column()
  workspaceMemberId: string;

  @Column()
  teamId: number;

  @ManyToOne(() => Team)
  team: Team;
}
