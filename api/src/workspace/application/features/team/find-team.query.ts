import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { TeamNotFound } from 'src/workspace/domain/exceptions';
import { TeamRepository } from 'src/workspace/infrastructure/repositories';

export class FindTeam {
  constructor(public teamId: number) {}
}

@QueryHandler(FindTeam)
export class FindTeamQuery implements IQueryHandler<FindTeam> {
  constructor(private teamRepo: TeamRepository) {}

  async execute({ teamId }: FindTeam) {
    const team = this.teamRepo.findOne({ where: { id: teamId } });
    if (!team) throw new TeamNotFound();
    return team;
  }
}
